import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { eachDayOfInterval } from "date-fns";
import { unstable_cache } from "next/cache";
import {
  endOfJakartaMonthUtc,
  getJakartaDateKey,
  startOfJakartaMonthUtc,
  toJakartaDate,
} from "@/lib/timezone";

export interface MonitoringStats {
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
  }[];
  byProgram: {
    programId: string;
    programName: string;
    divisionName: string;
    total: number;
    completed: number;
    completedWithIssue: number;
    notExecuted: number;
    pending: number;
    completionRate: number;
  }[];
  dailyTrend: {
    date: string;
    completed: number;
    completedWithIssue: number;
    notExecuted: number;
    pending: number;
  }[];
}

async function computeMonitoringStats({
  monthStart,
  monthEnd,
  monthStartJakarta,
  monthEndJakarta,
  divisionId,
}: {
  monthStart: Date;
  monthEnd: Date;
  monthStartJakarta: Date;
  monthEndJakarta: Date;
  divisionId: string | null;
}): Promise<MonitoringStats> {
  const divisionFilter = divisionId ? { program: { divisionId } } : {};

  const schedules = await prisma.scheduleInstance.findMany({
    where: {
      date: {
        gte: monthStart,
        lte: monthEnd,
      },
      ...divisionFilter,
    },
    select: {
      date: true,
      programId: true,
      program: {
        select: {
          name: true,
          divisionId: true,
          division: { select: { name: true } },
        },
      },
      sessions: {
        select: {
          status: true,
        },
      },
    },
  });

  const stats: MonitoringStats = {
    overview: {
      totalSchedules: 0,
      completed: 0,
      completedWithIssue: 0,
      notExecuted: 0,
      pending: 0,
      completionRate: 0,
    },
    byDivision: [],
    byProgram: [],
    dailyTrend: [],
  };

  const divisionMap = new Map<string, (typeof stats.byDivision)[0]>();
  const programMap = new Map<string, (typeof stats.byProgram)[0]>();
  const dailyMap = new Map<string, (typeof stats.dailyTrend)[0]>();

  const daysInMonth = eachDayOfInterval({
    start: monthStartJakarta,
    end: monthEndJakarta,
  });
  for (const day of daysInMonth) {
    const dateStr = getJakartaDateKey(day);
    dailyMap.set(dateStr, {
      date: dateStr,
      completed: 0,
      completedWithIssue: 0,
      notExecuted: 0,
      pending: 0,
    });
  }

  for (const schedule of schedules) {
    const divisionId = schedule.program.divisionId;
    const divisionName = schedule.program.division.name;
    const programId = schedule.programId;
    const programName = schedule.program.name;
    const dateStr = getJakartaDateKey(schedule.date);

    let status:
      | "completed"
      | "completedWithIssue"
      | "notExecuted"
      | "pending" = "pending";

    if (schedule.sessions.length > 0) {
      const sessionStatuses = schedule.sessions.map((s) => s.status);
      if (sessionStatuses.includes("COMPLETED")) {
        status = "completed";
      } else if (sessionStatuses.includes("COMPLETED_WITH_ISSUE")) {
        status = "completedWithIssue";
      } else if (sessionStatuses.includes("NOT_EXECUTED")) {
        status = "notExecuted";
      }
    }

    stats.overview.totalSchedules++;
    stats.overview[status]++;

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
      });
    }
    const divStats = divisionMap.get(divisionId)!;
    divStats.total++;
    divStats[status]++;

    if (!programMap.has(programId)) {
      programMap.set(programId, {
        programId,
        programName,
        divisionName,
        total: 0,
        completed: 0,
        completedWithIssue: 0,
        notExecuted: 0,
        pending: 0,
        completionRate: 0,
      });
    }
    const progStats = programMap.get(programId)!;
    progStats.total++;
    progStats[status]++;

    const dayStats = dailyMap.get(dateStr);
    if (dayStats) {
      dayStats[status]++;
    }
  }

  stats.overview.completionRate =
    stats.overview.totalSchedules > 0
      ? Math.round(
          ((stats.overview.completed + stats.overview.completedWithIssue) /
            stats.overview.totalSchedules) *
            100
        )
      : 0;

  for (const divStats of divisionMap.values()) {
    divStats.completionRate =
      divStats.total > 0
        ? Math.round(
            ((divStats.completed + divStats.completedWithIssue) /
              divStats.total) *
              100
          )
        : 0;
  }

  for (const progStats of programMap.values()) {
    progStats.completionRate =
      progStats.total > 0
        ? Math.round(
            ((progStats.completed + progStats.completedWithIssue) /
              progStats.total) *
              100
          )
        : 0;
  }

  stats.byDivision = Array.from(divisionMap.values()).sort((a, b) =>
    a.divisionName.localeCompare(b.divisionName)
  );
  stats.byProgram = Array.from(programMap.values()).sort((a, b) =>
    a.programName.localeCompare(b.programName)
  );
  stats.dailyTrend = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
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
    const monthParam = searchParams.get("month"); // Format: YYYY-MM

    // Parse month or default to current month
    let targetDate = new Date();
    if (monthParam) {
      const [year, month] = monthParam.split("-").map(Number);
      targetDate = new Date(Date.UTC(year, month - 1, 1, 12));
    }

    const monthStart = startOfJakartaMonthUtc(targetDate);
    const monthEnd = endOfJakartaMonthUtc(targetDate);
    const monthStartJakarta = toJakartaDate(monthStart);
    const monthEndJakarta = toJakartaDate(monthEnd);

    const divisionId =
      session.user.role === "ADMIN" ? null : session.user.divisionId!;

    const monthKey = getJakartaDateKey(monthStart).slice(0, 7);
    const cacheKey = `${monthKey}:${divisionId ?? "all"}`;

    const getStats = unstable_cache(
      () =>
        computeMonitoringStats({
          monthStart,
          monthEnd,
          monthStartJakarta,
          monthEndJakarta,
          divisionId,
        }),
      ["monitoring", cacheKey],
      { revalidate: 300 }
    );

    const stats = await getStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching monitoring stats:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data monitoring" },
      { status: 500 }
    );
  }
}
