import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { divisionSchema } from "@/lib/validations/division";
import { parsePagination } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { take, skip } = parsePagination(searchParams);

    const divisions = await prisma.division.findMany({
      include: {
        _count: {
          select: { users: true, programs: true },
        },
      },
      ...(typeof take === "number" && take > 0 ? { take } : {}),
      ...(typeof skip === "number" && skip > 0 ? { skip } : {}),
      orderBy: { name: "asc" },
    });

    return NextResponse.json(divisions);
  } catch (error) {
    console.error("Error fetching divisions:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data divisi" },
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
    const parsed = divisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await prisma.division.findUnique({
      where: { name: parsed.data.name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Nama divisi sudah digunakan" },
        { status: 400 }
      );
    }

    const division = await prisma.division.create({
      data: parsed.data,
    });

    return NextResponse.json(division, { status: 201 });
  } catch (error) {
    console.error("Error creating division:", error);
    return NextResponse.json(
      { error: "Gagal membuat divisi" },
      { status: 500 }
    );
  }
}
