import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const current = await prisma.deadline.findUnique({
      where: { id },
      select: { completed: true },
    });

    if (!current) {
      return NextResponse.json(
        { error: "Deadline tidak ditemukan" },
        { status: 404 }
      );
    }

    const deadline = await prisma.deadline.update({
      where: { id },
      data: {
        completed: !current.completed,
      },
    });

    return NextResponse.json(deadline);
  } catch (error) {
    console.error("Error updating deadline status:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate status deadline" },
      { status: 500 }
    );
  }
}
