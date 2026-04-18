import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.agenda.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Agenda not found" }, { status: 404 });
    }

    const agenda = await prisma.agenda.update({
      where: { id },
      data: { completed: true },
    });

    return NextResponse.json(agenda);
  } catch (error) {
    console.error("Error updating agenda:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate agenda" },
      { status: 500 },
    );
  }
}
