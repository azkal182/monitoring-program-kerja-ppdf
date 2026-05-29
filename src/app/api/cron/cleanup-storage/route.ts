import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { assertCronAuth } from "@/lib/cron";
import { notifyCronSuccess, notifyCronFailure } from "@/lib/telegram";
import { subDays } from "date-fns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dipanggil setiap hari jam 02:00 WIB (19:00 UTC sehari sebelumnya)
// Hanya aktif jika STORAGE_DRIVER=r2
// Menghapus file fisik dari R2 untuk Photo dan Document yang berumur > 30 hari
// Record database tetap ada — purgedAt terisi sebagai penanda file sudah dihapus

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log("[cleanup-storage] Cron started");

  try {
    const unauthorized = assertCronAuth(request);
    if (unauthorized) {
      console.log("[cleanup-storage] Unauthorized request");
      return unauthorized;
    }

    // Hanya jalankan cleanup jika storage driver adalah R2
    const storageDriver = process.env.STORAGE_DRIVER;
    console.log(`[cleanup-storage] Storage driver: ${storageDriver ?? "local"}`);

    if (storageDriver !== "r2") {
      console.log(`[cleanup-storage] Skipped — driver bukan r2`);
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: `Cleanup hanya berjalan untuk STORAGE_DRIVER=r2, saat ini: ${storageDriver ?? "local"}`,
      });
    }

    const cutoffDate = subDays(new Date(), 30);

    // R2 public URL prefix — hanya hapus file yang URL-nya berasal dari R2
    const r2PublicUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
    if (!r2PublicUrl) {
      console.log("[cleanup-storage] R2_PUBLIC_URL tidak diset, abort");
      return NextResponse.json(
        { error: "R2_PUBLIC_URL tidak dikonfigurasi" },
        { status: 500 }
      );
    }
    console.log(`[cleanup-storage] R2 public URL prefix: ${r2PublicUrl}`);
    console.log(`[cleanup-storage] Cutoff date: ${cutoffDate.toISOString()}`);

    // ── Preview: hitung yang akan dihapus ───────────────────────────────
    console.log("[cleanup-storage] Querying photos and documents to purge...");
    const [photosToDelete, documentsToDelete] = await Promise.all([
      prisma.photo.findMany({
        where: {
          createdAt: { lt: cutoffDate },
          purgedAt: null,
          storagePath: { not: null },
          url: { startsWith: r2PublicUrl }, // hanya file R2
        },
        select: { id: true, storagePath: true },
      }),
      prisma.document.findMany({
        where: {
          createdAt: { lt: cutoffDate },
          purgedAt: null,
          storagePath: { not: null },
          url: { startsWith: r2PublicUrl }, // hanya file R2
        },
        select: { id: true, storagePath: true },
      }),
    ]);

    const willPurge = {
      photos: photosToDelete.length,
      documents: documentsToDelete.length,
      total: photosToDelete.length + documentsToDelete.length,
    };

    console.log(`[cleanup-storage] Will purge: ${willPurge.photos} photos, ${willPurge.documents} documents (total: ${willPurge.total})`);

    // Jika tidak ada yang perlu dihapus, return lebih awal
    if (willPurge.total === 0) {
      console.log("[cleanup-storage] Nothing to purge, exiting early");
      await notifyCronSuccess("Cleanup Storage (R2)", {
        "Storage Driver": "r2",
        "Cutoff": `> 30 hari (sebelum ${cutoffDate.toISOString().split("T")[0]})`,
        "Akan Dihapus": 0,
        "Status": "Tidak ada file yang perlu dihapus",
      });

      return NextResponse.json({
        ok: true,
        storageDriver: "r2",
        cutoffDate: cutoffDate.toISOString(),
        willPurge,
        photos: { purged: 0, errors: 0 },
        documents: { purged: 0, errors: 0 },
        total: 0,
      });
    }

    // ── Hapus foto lama ──────────────────────────────────────────────────
    console.log(`[cleanup-storage] Purging ${photosToDelete.length} photos...`);
    let photoPurgedCount = 0;
    let photoErrorCount = 0;

    for (const photo of photosToDelete) {
      console.log(`[cleanup-storage] Deleting photo ${photo.id} (path: ${photo.storagePath})`);
      try {
        if (photo.storagePath) {
          await deleteFile(photo.storagePath);
          console.log(`[cleanup-storage] ✓ Photo ${photo.id} deleted from R2`);
        }
        await prisma.photo.update({
          where: { id: photo.id },
          data: {
            purgedAt: new Date(),
            storagePath: null,
            url: "",
          },
        });
        photoPurgedCount++;
        console.log(`[cleanup-storage] ✓ Photo ${photo.id} marked as purged in DB`);
      } catch (err) {
        console.error(`[cleanup-storage] ✗ Failed to purge photo ${photo.id}:`, err);
        photoErrorCount++;
      }
    }

    // ── Hapus dokumen lama ───────────────────────────────────────────────
    console.log(`[cleanup-storage] Purging ${documentsToDelete.length} documents...`);
    let documentPurgedCount = 0;
    let documentErrorCount = 0;

    for (const doc of documentsToDelete) {
      console.log(`[cleanup-storage] Deleting document ${doc.id} (path: ${doc.storagePath})`);
      try {
        if (doc.storagePath) {
          await deleteFile(doc.storagePath);
          console.log(`[cleanup-storage] ✓ Document ${doc.id} deleted from R2`);
        }
        await prisma.document.update({
          where: { id: doc.id },
          data: {
            purgedAt: new Date(),
            storagePath: null,
            url: "",
          },
        });
        documentPurgedCount++;
        console.log(`[cleanup-storage] ✓ Document ${doc.id} marked as purged in DB`);
      } catch (err) {
        console.error(`[cleanup-storage] ✗ Failed to purge document ${doc.id}:`, err);
        documentErrorCount++;
      }
    }

    const totalPurged = photoPurgedCount + documentPurgedCount;
    const totalErrors = photoErrorCount + documentErrorCount;
    const elapsed = Date.now() - startTime;

    console.log(`[cleanup-storage] Done in ${elapsed}ms — purged: ${totalPurged}, errors: ${totalErrors}`);

    await notifyCronSuccess("Cleanup Storage (R2)", {
      "Storage Driver": "r2",
      "Cutoff": `> 30 hari (sebelum ${cutoffDate.toISOString().split("T")[0]})`,
      "Akan Dihapus": willPurge.total,
      "Foto Dihapus": photoPurgedCount,
      "Dokumen Dihapus": documentPurgedCount,
      "Total Dihapus": totalPurged,
      ...(totalErrors > 0 ? { "Error": totalErrors } : {}),
    });

    return NextResponse.json({
      ok: true,
      storageDriver: "r2",
      cutoffDate: cutoffDate.toISOString(),
      willPurge,
      photos: { purged: photoPurgedCount, errors: photoErrorCount },
      documents: { purged: documentPurgedCount, errors: documentErrorCount },
      total: totalPurged,
      elapsedMs: elapsed,
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[cleanup-storage] Fatal error after ${elapsed}ms:`, error);

    await notifyCronFailure(
      "Cleanup Storage (R2)",
      error instanceof Error ? error.message : "Unknown error",
      { "Error Type": error instanceof Error ? error.name : "Unknown" }
    );

    return NextResponse.json(
      { error: "Gagal menjalankan cleanup storage" },
      { status: 500 }
    );
  }
}
