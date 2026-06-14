import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { uploadFile, deleteFile } from "@/lib/storage";
import { formatBytes, getMaxUploadBytes } from "@/lib/uploads";
import { isAllowedDocumentFile } from "@/lib/document-file-types";
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
        { error: "Sesi sudah disubmit, tidak dapat menambah dokumen" },
        { status: 400 },
      );
    }

    if (session.schedule.program.requirementType !== "DOCUMENT") {
      return NextResponse.json(
        { error: "Program ini memerlukan foto, bukan dokumen" },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const displayName = formData.get("name");

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

    if (!isAllowedDocumentFile(file)) {
      return NextResponse.json(
        { error: "File harus berupa PDF, Word, Excel, PowerPoint, atau gambar" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadFile({
      buffer,
      contentType: file.type || "application/octet-stream",
      directory: `sessions/${sessionId}/documents`,
      fileName: file.name,
    });

    const document = await prisma.document.create({
      data: {
        url: uploadResult.url,
        filename: (displayName ? String(displayName) : file.name).slice(0, 190),
        storagePath: uploadResult.storagePath,
        sessionId,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Integration document upload API error:", error);
    return NextResponse.json(
      { error: "Gagal mengupload dokumen" },
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

    const documents = await prisma.document.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Integration document list API error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil dokumen" },
      { status: 500 },
    );
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
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
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

    const document = await prisma.document.findFirst({
      where: { id: documentId, sessionId },
    });

    if (!document) {
      return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
    }

    await prisma.document.delete({ where: { id: document.id } });
    if (document.storagePath) {
      await deleteFile(document.storagePath).catch(() => undefined);
    }

    return NextResponse.json({ message: "Dokumen berhasil dihapus" });
  } catch (error) {
    console.error("Integration document delete API error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus dokumen" },
      { status: 500 },
    );
  }
}
