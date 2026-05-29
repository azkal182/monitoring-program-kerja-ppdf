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
    const { key, publicUrl, displayName } = body as {
      key: string;
      publicUrl: string;
      displayName?: string;
    };

    if (!key || !publicUrl) {
      return NextResponse.json(
        { error: "key dan publicUrl wajib diisi" },
        { status: 400 }
      );
    }

    // Ambil nama file dari key jika displayName tidak diberikan
    const filename = displayName || key.split("/").pop() || key;

    const document = await prisma.document.create({
      data: {
        url: publicUrl,
        filename: filename.slice(0, 190),
        storagePath: key,
        sessionId,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error confirming document upload:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data dokumen" },
      { status: 500 }
    );
  }
}
