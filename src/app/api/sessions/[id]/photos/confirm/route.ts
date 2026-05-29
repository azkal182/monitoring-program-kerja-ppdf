import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getUploadMode } from "@/lib/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (getUploadMode() !== "signed") {
      return NextResponse.json(
        { error: "Confirm endpoint tidak tersedia untuk storage driver ini" },
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
        { error: "Sesi sudah disubmit" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { key, publicUrl, caption } = body as {
      key: string;
      publicUrl: string;
      caption?: string;
    };

    if (!key || !publicUrl) {
      return NextResponse.json(
        { error: "key dan publicUrl wajib diisi" },
        { status: 400 }
      );
    }

    const photo = await prisma.photo.create({
      data: {
        url: publicUrl,
        caption: caption ? String(caption).slice(0, 200) : null,
        storagePath: key,
        sessionId,
      },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error("Error confirming photo upload:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data foto" },
      { status: 500 }
    );
  }
}
