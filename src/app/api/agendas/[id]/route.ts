import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { agendaSchema } from "@/lib/validations/agenda";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = agendaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
        { status: 400 },
      );
    }

    const existing = await prisma.agenda.findFirst({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Agenda tidak ditemukan" },
        { status: 404 },
      );
    }
    const agenda = await prisma.agenda.update({
      where: { id },
      data: parsed.data,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.agenda.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Agenda berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting agenda:", error);
    return NextResponse.json(
      { error: "Gagal menghapus agenda" },
      { status: 500 },
    );
  }
}
