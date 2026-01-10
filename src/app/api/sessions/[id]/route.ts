import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sessionSubmitSchema } from "@/lib/validations/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, username: true } },
        schedule: {
          include: {
            program: { include: { division: true } },
          },
        },
        photos: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Sesi tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data sesi" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = sessionSubmitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check if session exists and belongs to user
    const existingSession = await prisma.session.findUnique({
      where: { id },
      include: { schedule: { include: { program: true } } },
    });

    if (!existingSession) {
      return NextResponse.json(
        { error: "Sesi tidak ditemukan" },
        { status: 404 }
      );
    }

    if (
      existingSession.userId !== authSession.user.id &&
      authSession.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke sesi ini" },
        { status: 403 }
      );
    }

    if (existingSession.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Sesi sudah disubmit dan tidak dapat diubah" },
        { status: 400 }
      );
    }

    // Validate issue note for COMPLETED_WITH_ISSUE
    if (
      parsed.data.status === "COMPLETED_WITH_ISSUE" &&
      !parsed.data.issueNote
    ) {
      return NextResponse.json(
        { error: "Catatan kendala wajib diisi" },
        { status: 400 }
      );
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: {
        status: parsed.data.status,
        issueNote: parsed.data.issueNote,
        submittedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true } },
        schedule: { include: { program: true } },
        photos: true,
      },
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate sesi" },
      { status: 500 }
    );
  }
}
