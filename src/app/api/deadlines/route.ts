import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { deadlineSchema } from "@/lib/validations/deadline";
import {
  endOfJakartaMonthUtc,
  startOfJakartaDayUtc,
  startOfJakartaMonthUtc,
} from "@/lib/timezone";

const MONTH_PARAM_REGEX = /^\d{4}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");
    const divisionParam = searchParams.get("divisionId");

    const targetDate = (() => {
      if (monthParam && MONTH_PARAM_REGEX.test(monthParam)) {
        const [year, month] = monthParam.split("-").map(Number);
        return new Date(Date.UTC(year, month - 1, 1, 12));
      }
      return new Date();
    })();

    const monthStart = startOfJakartaMonthUtc(targetDate);
    const monthEnd = endOfJakartaMonthUtc(targetDate);

    const isAdmin = session.user.role === "ADMIN";
    const divisionFilter = (() => {
      if (isAdmin) {
        if (divisionParam) return { divisionId: divisionParam };
        return {};
      }
      if (session.user.divisionId) {
        return {
          OR: [{ divisionId: session.user.divisionId }, { divisionId: null }],
        };
      }
      return { divisionId: null };
    })();

    const deadlines = await prisma.deadline.findMany({
      where: {
        dueDate: { gte: monthStart, lte: monthEnd },
        ...divisionFilter,
      },
      include: {
        division: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { title: "asc" }],
    });

    return NextResponse.json(deadlines);
  } catch (error) {
    console.error("Error fetching deadlines:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data deadline" },
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

    const deadline = await prisma.deadline.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        dueDate: startOfJakartaDayUtc(parsed.data.dueDate),
        divisionId,
      },
      include: { division: { select: { id: true, name: true } } },
    });

    return NextResponse.json(deadline, { status: 201 });
  } catch (error) {
    console.error("Error creating deadline:", error);
    return NextResponse.json(
      { error: "Gagal membuat deadline" },
      { status: 500 }
    );
  }
}
