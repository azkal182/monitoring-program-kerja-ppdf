import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sessionStartSchema } from "@/lib/validations/session";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("scheduleId");
    const userId = searchParams.get("userId");

    const sessions = await prisma.session.findMany({
      where: {
        ...(scheduleId && { scheduleId }),
        ...(userId && { userId }),
      },
      include: {
        user: { select: { id: true, name: true, username: true } },
        schedule: {
          include: {
            program: { include: { division: true } },
          },
        },
        photos: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data sesi" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = sessionStartSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { scheduleId } = parsed.data;

    // Check if schedule exists
    const scheduleInstance = await prisma.scheduleInstance.findUnique({
      where: { id: scheduleId },
      include: { program: true },
    });

    if (!scheduleInstance) {
      return NextResponse.json(
        { error: "Jadwal tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if user already has a session for this schedule
    const existingSession = await prisma.session.findFirst({
      where: {
        scheduleId,
        userId: session.user.id,
      },
    });

    if (existingSession) {
      return NextResponse.json(
        {
          error: "Anda sudah memulai sesi untuk jadwal ini",
          session: existingSession,
        },
        { status: 400 }
      );
    }

    // Create new session
    const newSession = await prisma.session.create({
      data: {
        scheduleId,
        userId: session.user.id,
        status: "DRAFT",
      },
      include: {
        user: { select: { id: true, name: true } },
        schedule: {
          include: {
            program: true,
          },
        },
        photos: true,
      },
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json({ error: "Gagal memulai sesi" }, { status: 500 });
  }
}
