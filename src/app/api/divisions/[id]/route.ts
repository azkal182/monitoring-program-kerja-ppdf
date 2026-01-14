import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { divisionSchema } from "@/lib/validations/division";

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

    if (session.user.role !== "ADMIN" && session.user.divisionId !== id) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke divisi ini" },
        { status: 403 }
      );
    }

    const division = await prisma.division.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, name: true, username: true, role: true },
        },
        programs: {
          select: {
            id: true,
            name: true,
            description: true,
            scheduleType: true,
            scheduleDays: true,
            scheduleMonthDays: true,
            customDates: true,
            scheduleTime: true,
            requirementType: true,
            minUploads: true,
            isActive: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!division) {
      return NextResponse.json(
        { error: "Divisi tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(division);
  } catch (error) {
    console.error("Error fetching division:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data divisi" },
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
    const parsed = divisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      );
    }

    const existing = await prisma.division.findFirst({
      where: { name: parsed.data.name, NOT: { id } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Nama divisi sudah digunakan" },
        { status: 400 }
      );
    }

    const division = await prisma.division.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(division);
  } catch (error) {
    console.error("Error updating division:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate divisi" },
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

    await prisma.division.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Divisi berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting division:", error);
    return NextResponse.json(
      { error: "Gagal menghapus divisi" },
      { status: 500 }
    );
  }
}
