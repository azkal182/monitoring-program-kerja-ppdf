import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { agendaSchema } from "@/lib/validations/agenda";
import { NextResponse } from "next/server";

export async function GET() {
  const agendas = await prisma.agenda.findMany({
    orderBy: { date: "asc" },
  });
  return NextResponse.json(agendas);
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = agendaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const newAgenda = await prisma.agenda.create({
      data: {
        name: parsed.data.name,
        personResponsible: parsed.data.personResponsible,
        date: parsed.data.date,
        quarterId: parsed.data.quarterId,
      },
    });

    return NextResponse.json(newAgenda, { status: 201 });
  } catch (error) {
    console.error("Error creating agenda:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
