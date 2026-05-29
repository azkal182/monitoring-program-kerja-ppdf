import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateSignedUpload, getUploadMode } from "@/lib/storage";
import { formatBytes, getMaxUploadBytes } from "@/lib/uploads";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Hanya tersedia jika STORAGE_DRIVER=r2
    if (getUploadMode() !== "signed") {
      return NextResponse.json(
        { error: "Signed upload tidak tersedia untuk storage driver ini" },
        { status: 400 }
      );
    }

    const authSession = await auth();
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { schedule: { include: { program: true } } },
    });

    if (!session) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    }

    if (session.userId !== authSession.user.id && authSession.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    if (session.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Sesi sudah disubmit, tidak dapat menambah foto" },
        { status: 400 }
      );
    }

    if (session.schedule.program.requirementType !== "PHOTO") {
      return NextResponse.json(
        { error: "Program ini memerlukan dokumen, bukan foto" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { fileName, contentType, fileSize } = body as {
      fileName: string;
      contentType: string;
      fileSize: number;
    };

    if (!fileName || !contentType || !fileSize) {
      return NextResponse.json(
        { error: "fileName, contentType, dan fileSize wajib diisi" },
        { status: 400 }
      );
    }

    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar" }, { status: 400 });
    }

    const maxBytes = getMaxUploadBytes();
    if (fileSize > maxBytes) {
      return NextResponse.json(
        { error: `Ukuran file maksimal ${formatBytes(maxBytes)}` },
        { status: 400 }
      );
    }

    const result = await generateSignedUpload(
      `sessions/${sessionId}/photos`,
      fileName,
      contentType
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating signed URL for photo:", error);
    return NextResponse.json(
      { error: "Gagal membuat signed URL" },
      { status: 500 }
    );
  }
}
