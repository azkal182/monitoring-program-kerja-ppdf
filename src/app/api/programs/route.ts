import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { programSchema } from "@/lib/validations/program";
import { parsePagination } from "@/lib/pagination";

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

    return NextResponse.json(programs);
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
    if (!session?.user || session.user.role !== "ADMIN") {
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

    const program = await prisma.program.create({
      data: parsed.data,
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
