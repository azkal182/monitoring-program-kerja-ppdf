import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { programUpdateSchema } from "@/lib/validations/program";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const program = await prisma.program.findUnique({
      where: { id },
      include: {
        division: true,
        schedules: {
          take: 10,
          orderBy: { date: "desc" },
          include: {
            sessions: {
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!program) {
      return NextResponse.json(
        { error: "Program tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(program);
  } catch (error) {
    console.error("Error fetching program:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data program" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = programUpdateSchema.safeParse({ ...body, id });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { id: _, ...data } = parsed.data;

    const program = await prisma.program.update({
      where: { id },
      data,
      include: {
        division: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(program);
  } catch (error) {
    console.error("Error updating program:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate program" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.program.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Program berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting program:", error);
    return NextResponse.json(
      { error: "Gagal menghapus program" },
      { status: 500 }
    );
  }
}
