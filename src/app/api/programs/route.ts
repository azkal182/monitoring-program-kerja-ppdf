import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { programSchema } from "@/lib/validations/program";
import { startOfJakartaDayUtc } from "@/lib/timezone";
import { parsePagination } from "@/lib/pagination";

const SCHEDULE_TYPE_ORDER: Record<string, number> = {
  DAILY: 0,
  WEEKLY: 1,
  MONTHLY: 2,
  CUSTOM: 3,
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const divisionId = searchParams.get("divisionId");
    const isActive = searchParams.get("isActive");
    const { take, skip } = parsePagination(searchParams);

    // Non-admin users can only see their division's programs
    const userDivisionId =
      session.user.role !== "ADMIN" ? session.user.divisionId : null;

    const programs = await prisma.program.findMany({
      where: {
        ...(divisionId && { divisionId }),
        ...(userDivisionId && { divisionId: userDivisionId }),
        ...(isActive !== null && { isActive: isActive === "true" }),
      },
      include: {
        division: { select: { id: true, name: true } },
        _count: { select: { schedules: true } },
      },
      ...(typeof take === "number" && take > 0 ? { take } : {}),
      ...(typeof skip === "number" && skip > 0 ? { skip } : {}),
      orderBy: [{ division: { name: "asc" } }, { name: "asc" }],
    });

    const sorted = programs.sort((a, b) => {
      const typeOrder =
        (SCHEDULE_TYPE_ORDER[a.scheduleType] ?? 99) -
        (SCHEDULE_TYPE_ORDER[b.scheduleType] ?? 99);
      if (typeOrder !== 0) return typeOrder;
      // secondary: division name, then program name (already from DB but preserve after sort)
      const divOrder = a.division.name.localeCompare(b.division.name);
      if (divOrder !== 0) return divOrder;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(sorted);
  } catch (error) {
    console.error("Error fetching programs:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data program" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const canManagePrograms =
      session?.user?.role === "ADMIN" || session?.user?.role === "KOORDINATOR";

    if (!session?.user || !canManagePrograms) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = programSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    if (
      session.user.role === "KOORDINATOR" &&
      (!session.user.divisionId || parsed.data.divisionId !== session.user.divisionId)
    ) {
      return NextResponse.json(
        { error: "Koordinator hanya dapat membuat program untuk divisinya sendiri" },
        { status: 403 }
      );
    }

    const program = await prisma.program.create({
      data: {
        ...parsed.data,
        customDates: parsed.data.customDates.map((date) =>
          startOfJakartaDayUtc(date)
        ),
      },
      include: {
        division: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(program, { status: 201 });
  } catch (error) {
    console.error("Error creating program:", error);
    return NextResponse.json(
      { error: "Gagal membuat program" },
      { status: 500 }
    );
  }
}
