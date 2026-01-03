import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// For MVP, we use local file storage
// In production, replace with Uploadthing or Vercel Blob
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;

    // Check if session exists and belongs to user
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { schedule: { include: { program: true } } },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Sesi tidak ditemukan" },
        { status: 404 }
      );
    }

    if (
      session.userId !== authSession.user.id &&
      authSession.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke sesi ini" },
        { status: 403 }
      );
    }

    if (session.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Sesi sudah disubmit, tidak dapat menambah foto" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { image, caption } = body;

    if (!image) {
      return NextResponse.json(
        { error: "Image data required" },
        { status: 400 }
      );
    }

    // Decode base64 image
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json(
        { error: "Invalid image format" },
        { status: 400 }
      );
    }

    const [, extension, base64Data] = matches;
    const buffer = Buffer.from(base64Data, "base64");

    // Create upload directory if not exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Generate unique filename
    const filename = `${sessionId}-${Date.now()}.${extension}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const publicUrl = `/uploads/${filename}`;

    // Write file
    await writeFile(filepath, buffer);

    // Save to database
    const photo = await prisma.photo.create({
      data: {
        url: publicUrl,
        caption: caption || null,
        sessionId,
      },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error("Error uploading photo:", error);
    return NextResponse.json(
      { error: "Gagal mengupload foto" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;

    const photos = await prisma.photo.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(photos);
  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json(
      { error: "Gagal mengambil foto" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("photoId");

    if (!photoId) {
      return NextResponse.json({ error: "Photo ID required" }, { status: 400 });
    }

    // Check session ownership
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Sesi tidak ditemukan" },
        { status: 404 }
      );
    }

    if (
      session.userId !== authSession.user.id &&
      authSession.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses" },
        { status: 403 }
      );
    }

    if (session.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Sesi sudah disubmit" },
        { status: 400 }
      );
    }

    await prisma.photo.delete({
      where: { id: photoId },
    });

    return NextResponse.json({ message: "Foto berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { error: "Gagal menghapus foto" },
      { status: 500 }
    );
  }
}
