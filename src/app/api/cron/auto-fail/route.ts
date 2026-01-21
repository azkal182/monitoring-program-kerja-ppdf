import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getJakartaDateKey, startOfJakartaDayUtc } from "@/lib/timezone";
import { assertCronAuth } from "@/lib/cron";
import { notifyCronSuccess, notifyCronFailure } from "@/lib/telegram";

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
          select: {
            divisionId: true,
            requirementType: true,
            minUploads: true,
          },
        },
        sessions: {
          select: {
            id: true,
            status: true,
            userId: true,
            photos: { select: { id: true } },
            documents: { select: { id: true } },
          },
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

    // Separate DRAFT sessions by whether they meet requirements
    const draftSessionsToComplete: string[] = [];
    const draftSessionsToFail: string[] = [];

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
          // Check if session meets upload requirements
          const program = schedule.program;
          const requirementType = program.requirementType;
          const minUploads = program.minUploads;

          let uploadCount = 0;
          if (requirementType === "PHOTO") {
            uploadCount = session.photos?.length || 0;
          } else if (requirementType === "DOCUMENT") {
            uploadCount = session.documents?.length || 0;
          }

          // If requirements are met, mark for completion
          if (uploadCount >= minUploads) {
            draftSessionsToComplete.push(session.id);
          } else {
            draftSessionsToFail.push(session.id);
          }

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

    // Auto-complete DRAFT sessions that meet requirements
    let completedCount = 0;
    if (draftSessionsToComplete.length > 0) {
      await prisma.session.updateMany({
        where: {
          id: { in: draftSessionsToComplete },
          status: "DRAFT", // Only update if still DRAFT
        },
        data: {
          status: "COMPLETED",
          isAutoCreated: true,
          submittedAt: new Date(),
        },
      });
      completedCount = draftSessionsToComplete.length;
    }

    // Mark DRAFT sessions that don't meet requirements as NOT_EXECUTED
    if (draftSessionsToFail.length > 0) {
      await prisma.session.updateMany({
        where: {
          id: { in: draftSessionsToFail },
          status: "DRAFT", // Only update if still DRAFT (prevent overwriting user submissions)
        },
        data: {
          status: "NOT_EXECUTED",
          isAutoCreated: true,
          issueNote: "Tidak ada laporan yang disubmit",
          submittedAt: new Date(),
        },
      });
      failedCount += draftSessionsToFail.length;
    }

    if (createData.length > 0) {
      const result = await prisma.session.createMany({
        data: createData,
        skipDuplicates: true, // Skip if already exists (idempotency safety)
      });
      failedCount += result.count;
    }

    // Send Telegram notification
    await notifyCronSuccess("Auto-fail Programs", {
      Date: jakartaDateKey,
      "Programs Failed": failedCount,
      "Draft Updated": schedulesWithDraft.size,
      "New Sessions": createData.length,
    });

    return NextResponse.json({
      success: true,
      message: `Marked ${failedCount} programs as not executed`,
      count: failedCount,
      date: jakartaDateKey,
    });
  } catch (error) {
    console.error("Error running auto-fail:", error);

    // Send failure notification
    await notifyCronFailure(
      "Auto-fail Programs",
      error instanceof Error ? error.message : "Unknown error",
      {
        "Error Type": error instanceof Error ? error.name : "Unknown",
      },
    );

    return NextResponse.json(
      { error: "Failed to run auto-fail mechanism" },
      { status: 500 },
    );
  }
}
