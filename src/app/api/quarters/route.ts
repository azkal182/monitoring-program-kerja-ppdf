import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const periods = await prisma.quarter.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(periods);
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, period } = body;

    if (typeof period !== "string" || !/^\d{4}-\d{4}$/.test(period)) {
      return NextResponse.json(
        { error: "Invalid period format. Expected 'YYYY-YYYY'." },
        { status: 400 },
      );
    }

    const [startYear, endYear] = period.split("-").map(Number);
    if (endYear !== startYear + 1) {
      return NextResponse.json(
        { error: "Invalid period range. End year must be start year + 1." },
        { status: 400 },
      );
    }

    const formated = `${name} (${startYear}-${endYear})`;

    const existing = await prisma.quarter.findUnique({
      where: { name: formated },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Period already exists." },
        { status: 400 },
      );
    }

    const newPeriod = await prisma.quarter.create({
      data: { name: formated },
    });

    return NextResponse.json(newPeriod, { status: 201 });
  } catch (error) {
    console.error("Error creating period:", error);
    return NextResponse.json(
      { error: "Failed to create period" },
      { status: 500 },
    );
  }
}
