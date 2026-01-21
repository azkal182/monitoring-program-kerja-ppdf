import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { sessionStartSchema } from "@/lib/validations/session";
import { parsePagination } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("scheduleId");
    const userId = searchParams.get("userId");
    const { take, skip } = parsePagination(searchParams);
    const isAdmin = session.user.role === "ADMIN";

    if (!isAdmin && userId && userId !== session.user.id) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke data ini" },
        { status: 403 },
      );
    }

    const scopedUserId = isAdmin ? (userId ?? undefined) : session.user.id;

    const sessions = await prisma.session.findMany({
      where: {
        ...(scheduleId && { scheduleId }),
        ...(scopedUserId && { userId: scopedUserId }),
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
      ...(typeof take === "number" && take > 0 ? { take } : {}),
      ...(typeof skip === "number" && skip > 0 ? { skip } : {}),
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data sesi" },
      { status: 500 },
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
        { status: 400 },
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
        { status: 404 },
      );
    }

    if (
      session.user.role !== "ADMIN" &&
      scheduleInstance.program.divisionId !== session.user.divisionId
    ) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke jadwal ini" },
        { status: 403 },
      );
    }

    // Validate schedule time (allow starting 30 minutes before)
    const scheduleTime = scheduleInstance.program.scheduleTime;
    if (scheduleTime) {
      const [hours, minutes] = scheduleTime.split(":").map(Number);

      // Get current time in Jakarta timezone
      const now = new Date();
      const jakartaTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
      );

      // Create scheduled time for today in Jakarta
      const scheduledDateTime = new Date(jakartaTime);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      // Calculate time difference in minutes
      const diffMinutes =
        (scheduledDateTime.getTime() - jakartaTime.getTime()) / 60000;

      // Only allow if current time is within 30 minutes before schedule time
      // diffMinutes > 30 means too early (more than 30 min before)
      if (diffMinutes > 30) {
        const earliestTime = new Date(scheduledDateTime);
        earliestTime.setMinutes(earliestTime.getMinutes() - 30);
        const earliestTimeStr = earliestTime.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        });

        return NextResponse.json(
          {
            error: `Sesi hanya bisa dimulai mulai jam ${earliestTimeStr} (30 menit sebelum jadwal ${scheduleTime})`,
            scheduleTime,
            earliestTime: earliestTimeStr,
          },
          { status: 400 },
        );
      }
    }

    // Only allow one session per schedule
    const existingSession = await prisma.session.findFirst({
      where: { scheduleId },
      include: { user: { select: { id: true, name: true } } },
    });

    if (existingSession) {
      return NextResponse.json(
        {
          error: "Sesi untuk jadwal ini sudah dibuat",
          session: existingSession,
        },
        { status: 400 },
      );
    }

    // Create new session
    try {
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await prisma.session.findFirst({
          where: { scheduleId },
          include: {
            user: { select: { id: true, name: true } },
            schedule: { include: { program: true } },
            photos: true,
          },
        });

        if (existing) {
          return NextResponse.json(
            { error: "Sesi untuk jadwal ini sudah dibuat", session: existing },
            { status: 400 },
          );
        }
      }

      throw error;
    }
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json({ error: "Gagal memulai sesi" }, { status: 500 });
  }
}
