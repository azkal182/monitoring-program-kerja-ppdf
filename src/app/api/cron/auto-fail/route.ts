import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getJakartaDateKey, startOfJakartaDayUtc } from "@/lib/timezone";
import { assertCronAuth } from "@/lib/cron";

// This endpoint should be called daily at 23:30 Asia/Jakarta.
// Note: Vercel cron uses UTC, so 23:30 WIB is 16:30 UTC.
// Optional query param: ?date=YYYY-MM-DD to run for a specific date.
export async function GET(request: NextRequest) {
  try {
    const unauthorized = assertCronAuth(request);
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const customDate = searchParams.get("date");

    let dateOnly: Date;
    if (customDate) {
      // Parse custom date (expected format: YYYY-MM-DD)
      const parsed = new Date(customDate);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD" },
          { status: 400 },
        );
      }
      dateOnly = startOfJakartaDayUtc(parsed);
    } else {
      dateOnly = startOfJakartaDayUtc();
    }
    const jakartaDateKey = getJakartaDateKey(dateOnly);

    // Find all schedules for today without any submitted session
    const schedulesWithoutSession = await prisma.scheduleInstance.findMany({
      where: {
        date: dateOnly,
        sessions: {
          none: {
            status: {
              in: ["COMPLETED", "COMPLETED_WITH_ISSUE"],
            },
          },
        },
      },
      include: {
        program: {
          select: { divisionId: true },
        },
        sessions: {
          select: { id: true, status: true, userId: true },
        },
      },
    });

    let failedCount = 0;
    const draftSessionIds: string[] = [];
    const schedulesWithDraft = new Set<string>();

    const schedulesNeedingCreate = schedulesWithoutSession.filter(
      (schedule) => schedule.sessions.length === 0,
    );

    const divisionIds = Array.from(
      new Set(
        schedulesNeedingCreate.map((schedule) => schedule.program.divisionId),
      ),
    );

    const coordinators = await prisma.user.findMany({
      where: {
        divisionId: { in: divisionIds },
        role: "KOORDINATOR",
      },
      select: { id: true, divisionId: true },
    });

    const anyUsers = await prisma.user.findMany({
      where: { divisionId: { in: divisionIds } },
      select: { id: true, divisionId: true },
    });

    const assignedByDivision = new Map<string, string>();
    for (const coordinator of coordinators) {
      if (!coordinator.divisionId) continue;
      if (!assignedByDivision.has(coordinator.divisionId)) {
        assignedByDivision.set(coordinator.divisionId, coordinator.id);
      }
    }
    for (const user of anyUsers) {
      if (!user.divisionId) continue;
      if (!assignedByDivision.has(user.divisionId)) {
        assignedByDivision.set(user.divisionId, user.id);
      }
    }

    const createData: {
      scheduleId: string;
      userId: string;
      status: "NOT_EXECUTED";
      isAutoCreated: boolean;
      issueNote: string;
      submittedAt: Date;
    }[] = [];

    for (const schedule of schedulesWithoutSession) {
      if (
        schedule.sessions.some((session) => session.status === "NOT_EXECUTED")
      ) {
        continue;
      }

      const draftSessions = schedule.sessions.filter(
        (session) => session.status === "DRAFT",
      );
      if (draftSessions.length > 0) {
        for (const session of draftSessions) {
          draftSessionIds.push(session.id);
        }
        schedulesWithDraft.add(schedule.id);
        continue;
      }

      if (schedule.sessions.length === 0) {
        const assignedUserId = assignedByDivision.get(
          schedule.program.divisionId,
        );
        if (!assignedUserId) continue;

        createData.push({
          scheduleId: schedule.id,
          userId: assignedUserId,
          status: "NOT_EXECUTED",
          isAutoCreated: true,
          issueNote: "Tidak ada laporan yang disubmit",
          submittedAt: new Date(),
        });
      }
    }

    if (draftSessionIds.length > 0) {
      await prisma.session.updateMany({
        where: {
          id: { in: draftSessionIds },
          status: "DRAFT", // Only update if still DRAFT (prevent overwriting user submissions)
        },
        data: {
          status: "NOT_EXECUTED",
          isAutoCreated: true,
          issueNote: "Tidak ada laporan yang disubmit",
          submittedAt: new Date(),
        },
      });
      failedCount += schedulesWithDraft.size;
    }

    if (createData.length > 0) {
      const result = await prisma.session.createMany({
        data: createData,
        skipDuplicates: true, // Skip if already exists (idempotency safety)
      });
      failedCount += result.count;
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${failedCount} programs as not executed`,
      count: failedCount,
      date: jakartaDateKey,
    });
  } catch (error) {
    console.error("Error running auto-fail:", error);
    return NextResponse.json(
      { error: "Failed to run auto-fail mechanism" },
      { status: 500 },
    );
  }
}
