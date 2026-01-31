import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { deadlineSchema } from "@/lib/validations/deadline";
import { startOfJakartaDayUtc } from "@/lib/timezone";

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

    const deadline = await prisma.deadline.findUnique({
      where: { id },
      include: { division: { select: { id: true, name: true } } },
    });

    if (!deadline) {
      return NextResponse.json(
        { error: "Deadline tidak ditemukan" },
        { status: 404 }
      );
    }

    if (
      session.user.role !== "ADMIN" &&
      deadline.divisionId &&
      deadline.divisionId !== session.user.divisionId
    ) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke deadline ini" },
        { status: 403 }
      );
    }

    return NextResponse.json(deadline);
  } catch (error) {
    console.error("Error fetching deadline:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data deadline" },
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
    const parsed = deadlineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      );
    }

    const divisionId = parsed.data.divisionId || null;

    if (divisionId) {
      const divisionExists = await prisma.division.findUnique({
        where: { id: divisionId },
        select: { id: true },
      });
      if (!divisionExists) {
        return NextResponse.json(
          { error: "Divisi tidak ditemukan" },
          { status: 400 }
        );
      }
    }

    const deadline = await prisma.deadline.update({
      where: { id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        dueDate: startOfJakartaDayUtc(parsed.data.dueDate),
        divisionId,
      },
      include: { division: { select: { id: true, name: true } } },
    });

    return NextResponse.json(deadline);
  } catch (error) {
    console.error("Error updating deadline:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate deadline" },
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

    await prisma.deadline.delete({ where: { id } });

    return NextResponse.json({ message: "Deadline berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting deadline:", error);
    return NextResponse.json(
      { error: "Gagal menghapus deadline" },
      { status: 500 }
    );
  }
}
