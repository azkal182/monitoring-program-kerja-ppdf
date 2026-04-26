import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { sessionStartSchema } from "@/lib/validations/session";
import {
  authenticateIntegrationClient,
  isDivisionAllowed,
} from "@/lib/integration-auth";
import { pickDivisionAssignee } from "@/lib/integration-session";

export async function POST(request: NextRequest) {
  try {
    const integrationClient = authenticateIntegrationClient(request);
    if (!integrationClient.ok) {
      return NextResponse.json(
        { error: integrationClient.error },
        { status: integrationClient.status },
      );
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

    if (!isDivisionAllowed(integrationClient.divisionIds, scheduleInstance.program.divisionId)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke jadwal ini" },
        { status: 403 },
      );
    }

    const scheduleTime = scheduleInstance.program.scheduleTime;
    if (scheduleTime) {
      const [hours, minutes] = scheduleTime.split(":").map(Number);
      const now = new Date();
      const jakartaTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
      );

      const scheduledDateTime = new Date(jakartaTime);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      const diffMinutes =
        (scheduledDateTime.getTime() - jakartaTime.getTime()) / 60000;

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

    const assigneeUserId = await pickDivisionAssignee(scheduleInstance.program.divisionId);
    if (!assigneeUserId) {
      return NextResponse.json(
        { error: "Tidak ada user pada divisi ini untuk membuat sesi" },
        { status: 422 },
      );
    }

    try {
      const newSession = await prisma.session.create({
        data: {
          scheduleId,
          userId: assigneeUserId,
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
          documents: true,
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
            documents: true,
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
    console.error("Integration sessions start API error:", error);
    return NextResponse.json({ error: "Gagal memulai sesi" }, { status: 500 });
  }
}
