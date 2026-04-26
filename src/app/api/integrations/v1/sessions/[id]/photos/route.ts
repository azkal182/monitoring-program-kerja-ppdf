import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { uploadFile, deleteFile } from "@/lib/storage";
import { formatBytes, getMaxUploadBytes } from "@/lib/uploads";
import {
  authenticateIntegrationClient,
  isDivisionAllowed,
} from "@/lib/integration-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const integrationClient = authenticateIntegrationClient(request);
    if (!integrationClient.ok) {
      return NextResponse.json(
        { error: integrationClient.error },
        { status: integrationClient.status },
      );
    }

    const { id: sessionId } = await params;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { schedule: { include: { program: true } } },
    });

    if (!session) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    }

    if (!isDivisionAllowed(integrationClient.divisionIds, session.schedule.program.divisionId)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke sesi ini" },
        { status: 403 },
      );
    }

    if (session.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Sesi sudah disubmit, tidak dapat menambah foto" },
        { status: 400 },
      );
    }

    if (session.schedule.program.requirementType !== "PHOTO") {
      return NextResponse.json(
        { error: "Program ini memerlukan dokumen, bukan foto" },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const caption = formData.get("caption");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File kosong" }, { status: 400 });
    }

    const maxBytes = getMaxUploadBytes();
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `Ukuran file maksimal ${formatBytes(maxBytes)}` },
        { status: 400 },
      );
    }

    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadFile({
      buffer,
      contentType: file.type || "application/octet-stream",
      directory: `sessions/${sessionId}/photos`,
      fileName: file.name,
    });

    const photo = await prisma.photo.create({
      data: {
        url: uploadResult.url,
        caption: caption ? String(caption).slice(0, 200) : null,
        storagePath: uploadResult.storagePath,
        sessionId,
      },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error("Integration photo upload API error:", error);
    return NextResponse.json(
      { error: "Gagal mengupload foto" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const integrationClient = authenticateIntegrationClient(request);
    if (!integrationClient.ok) {
      return NextResponse.json(
        { error: integrationClient.error },
        { status: integrationClient.status },
      );
    }

    const { id: sessionId } = await params;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        schedule: { select: { program: { select: { divisionId: true } } } },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    }

    if (!isDivisionAllowed(integrationClient.divisionIds, session.schedule.program.divisionId)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke sesi ini" },
        { status: 403 },
      );
    }

    const photos = await prisma.photo.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(photos);
  } catch (error) {
    console.error("Integration photo list API error:", error);
    return NextResponse.json({ error: "Gagal mengambil foto" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const integrationClient = authenticateIntegrationClient(request);
    if (!integrationClient.ok) {
      return NextResponse.json(
        { error: integrationClient.error },
        { status: integrationClient.status },
      );
    }

    const { id: sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("photoId");

    if (!photoId) {
      return NextResponse.json({ error: "Photo ID required" }, { status: 400 });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { schedule: { include: { program: true } } },
    });

    if (!session) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    }

    if (!isDivisionAllowed(integrationClient.divisionIds, session.schedule.program.divisionId)) {
      return NextResponse.json({ error: "Anda tidak memiliki akses" }, { status: 403 });
    }

    if (session.status !== "DRAFT") {
      return NextResponse.json({ error: "Sesi sudah disubmit" }, { status: 400 });
    }

    const photo = await prisma.photo.findFirst({
      where: { id: photoId, sessionId },
    });

    if (!photo) {
      return NextResponse.json({ error: "Foto tidak ditemukan" }, { status: 404 });
    }

    await prisma.photo.delete({ where: { id: photo.id } });
    if (photo.storagePath) {
      await deleteFile(photo.storagePath).catch(() => undefined);
    }

    return NextResponse.json({ message: "Foto berhasil dihapus" });
  } catch (error) {
    console.error("Integration photo delete API error:", error);
    return NextResponse.json({ error: "Gagal menghapus foto" }, { status: 500 });
  }
}
