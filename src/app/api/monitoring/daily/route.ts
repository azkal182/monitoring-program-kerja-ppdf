import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { getJakartaDateKey, startOfJakartaDayUtc } from "@/lib/timezone";

export interface DailyMonitoringStats {
  date: string;
  overview: {
    totalSchedules: number;
    completed: number;
    completedWithIssue: number;
    notExecuted: number;
    pending: number;
    completionRate: number;
  };
  byDivision: {
    divisionId: string;
    divisionName: string;
    total: number;
    completed: number;
    completedWithIssue: number;
    notExecuted: number;
    pending: number;
    completionRate: number;
    programs: {
      scheduleId: string;
      programId: string;
      programName: string;
      scheduleTime: string | null;
      status: "completed" | "issue" | "failed" | "pending";
      userId: string | null;
      userName: string | null;
      submittedAt: Date | null;
      sessionId: string | null;
      isAutoCreated: boolean;
    }[];
  }[];
}

async function computeDailyStats({
  dayStart,
  divisionId,
}: {
  dayStart: Date;
  divisionId: string | null;
}): Promise<DailyMonitoringStats> {
  const divisionFilter = divisionId ? { program: { divisionId } } : {};

  const schedules = await prisma.scheduleInstance.findMany({
    where: {
      date: dayStart,
      ...divisionFilter,
    },
    select: {
      id: true,
      date: true,
      programId: true,
      program: {
        select: {
          name: true,
          scheduleTime: true,
          divisionId: true,
          division: { select: { name: true } },
        },
      },
      sessions: {
        select: {
          id: true,
          status: true,
          userId: true,
          submittedAt: true,
          isAutoCreated: true,
          user: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { program: { division: { name: "asc" } } },
      { program: { scheduleTime: "asc" } },
      { program: { name: "asc" } },
    ],
  });

  const stats: DailyMonitoringStats = {
    date: getJakartaDateKey(dayStart),
    overview: {
      totalSchedules: 0,
      completed: 0,
      completedWithIssue: 0,
      notExecuted: 0,
      pending: 0,
      completionRate: 0,
    },
    byDivision: [],
  };

  const divisionMap = new Map<string, (typeof stats.byDivision)[0]>();

  for (const schedule of schedules) {
    const divisionId = schedule.program.divisionId;
    const divisionName = schedule.program.division.name;

    // Determine status
    let status: "completed" | "issue" | "failed" | "pending" = "pending";
    const session = schedule.sessions[0];
    let userId: string | null = null;
    let userName: string | null = null;
    let submittedAt: Date | null = null;
    let sessionId: string | null = null;
    let isAutoCreated = false;

    if (session) {
      sessionId = session.id;
      userId = session.userId;
      userName = session.user?.name || null;
      submittedAt = session.submittedAt;
      isAutoCreated = session.isAutoCreated || false;

      switch (session.status) {
        case "COMPLETED":
          status = "completed";
          break;
        case "COMPLETED_WITH_ISSUE":
          status = "issue";
          break;
        case "NOT_EXECUTED":
          status = "failed";
          break;
        case "DRAFT":
          status = "pending";
          break;
      }
    }

    // Update overview
    stats.overview.totalSchedules++;
    if (status === "completed") {
      stats.overview.completed++;
    } else if (status === "issue") {
      stats.overview.completedWithIssue++;
    } else if (status === "failed") {
      stats.overview.notExecuted++;
    } else {
      stats.overview.pending++;
    }

    // Update division stats
    if (!divisionMap.has(divisionId)) {
      divisionMap.set(divisionId, {
        divisionId,
        divisionName,
        total: 0,
        completed: 0,
        completedWithIssue: 0,
        notExecuted: 0,
        pending: 0,
        completionRate: 0,
        programs: [],
      });
    }

    const divStats = divisionMap.get(divisionId)!;
    divStats.total++;

    if (status === "completed") {
      divStats.completed++;
    } else if (status === "issue") {
      divStats.completedWithIssue++;
    } else if (status === "failed") {
      divStats.notExecuted++;
    } else {
      divStats.pending++;
    }

    divStats.programs.push({
      scheduleId: schedule.id,
      programId: schedule.programId,
      programName: schedule.program.name,
      scheduleTime: schedule.program.scheduleTime,
      status,
      userId,
      userName,
      submittedAt,
      sessionId,
      isAutoCreated,
    });
  }

  // Calculate completion rates
  stats.overview.completionRate =
    stats.overview.totalSchedules > 0
      ? Math.round(
          ((stats.overview.completed + stats.overview.completedWithIssue) /
            stats.overview.totalSchedules) *
            100,
        )
      : 0;

  for (const divStats of divisionMap.values()) {
    divStats.completionRate =
      divStats.total > 0
        ? Math.round(
            ((divStats.completed + divStats.completedWithIssue) /
              divStats.total) *
              100,
          )
        : 0;
  }

  stats.byDivision = Array.from(divisionMap.values()).sort((a, b) =>
    a.divisionName.localeCompare(b.divisionName),
  );

  return stats;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date"); // Format: YYYY-MM-DD

    // Parse date or default to today
    let targetDate = new Date();
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD" },
          { status: 400 },
        );
      }
      targetDate = parsed;
    }

    const dayStart = startOfJakartaDayUtc(targetDate);

    const divisionId =
      session.user.role === "ADMIN" ? null : session.user.divisionId!;

    const dateKey = getJakartaDateKey(dayStart);
    const cacheKey = `daily:${dateKey}:${divisionId ?? "all"}`;

    const getStats = unstable_cache(
      () =>
        computeDailyStats({
          dayStart,
          divisionId,
        }),
      ["monitoring-daily", cacheKey],
      { revalidate: 60 }, // Cache for 1 minute (more frequent than monthly)
    );

    const stats = await getStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching daily monitoring stats:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data monitoring harian" },
      { status: 500 },
    );
  }
}
