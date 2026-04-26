import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { programUpdateSchema } from "@/lib/validations/program";
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

    if (
      session.user.role !== "ADMIN" &&
      program.divisionId !== session.user.divisionId
    ) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke program ini" },
        { status: 403 }
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

    const { id: parsedId, ...data } = parsed.data;
    void parsedId;

    const existingProgram = await prisma.program.findUnique({
      where: { id },
      select: {
        scheduleType: true,
        scheduleDays: true,
        scheduleMonthDays: true,
        customDates: true,
      },
    });

    if (!existingProgram) {
      return NextResponse.json(
        { error: "Program tidak ditemukan" },
        { status: 404 }
      );
    }

    const nextScheduleType = data.scheduleType ?? existingProgram.scheduleType;
    const nextScheduleDays = data.scheduleDays ?? existingProgram.scheduleDays;
    const nextScheduleMonthDays =
      data.scheduleMonthDays ?? existingProgram.scheduleMonthDays;
    const nextCustomDates = data.customDates ?? existingProgram.customDates;

    if (
      (nextScheduleType === "DAILY" || nextScheduleType === "WEEKLY") &&
      nextScheduleDays.length === 0
    ) {
      return NextResponse.json(
        { error: "Pilih hari jadwal untuk program ini" },
        { status: 400 }
      );
    }

    if (nextScheduleType === "MONTHLY" && nextScheduleMonthDays.length === 0) {
      return NextResponse.json(
        { error: "Pilih tanggal jadwal bulanan untuk program ini" },
        { status: 400 }
      );
    }

    if (nextScheduleType === "CUSTOM" && nextCustomDates.length === 0) {
      return NextResponse.json(
        { error: "Pilih tanggal khusus untuk program ini" },
        { status: 400 }
      );
    }

    const normalizedData = {
      ...data,
      ...(Array.isArray(data.customDates)
        ? { customDates: data.customDates.map((date) => startOfJakartaDayUtc(date)) }
        : {}),
    };

    const program = await prisma.program.update({
      where: { id },
      data: normalizedData,
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
