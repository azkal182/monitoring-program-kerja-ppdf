import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";

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
      targetDate = new Date(year, month - 1, 1);
    }

    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    // Filter by division for non-admin users
    const divisionFilter =
      session.user.role === "ADMIN"
        ? {}
        : { program: { divisionId: session.user.divisionId! } };

    // Get all schedule instances for the month
    const schedules = await prisma.scheduleInstance.findMany({
      where: {
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
        ...divisionFilter,
      },
      include: {
        program: {
          include: {
            division: true,
          },
        },
        sessions: {
          select: {
            status: true,
          },
        },
      },
    });

    // Calculate statistics
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

    // Group by division and program
    const divisionMap = new Map<string, (typeof stats.byDivision)[0]>();
    const programMap = new Map<string, (typeof stats.byProgram)[0]>();
    const dailyMap = new Map<string, (typeof stats.dailyTrend)[0]>();

    // Initialize daily trend for all days in month
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    for (const day of daysInMonth) {
      const dateStr = format(day, "yyyy-MM-dd");
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
      const dateStr = format(schedule.date, "yyyy-MM-dd");

      // Determine status from sessions
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

      // Update overview
      stats.overview.totalSchedules++;
      stats.overview[status]++;

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
        });
      }
      const divStats = divisionMap.get(divisionId)!;
      divStats.total++;
      divStats[status]++;

      // Update program stats
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

      // Update daily trend
      const dayStats = dailyMap.get(dateStr);
      if (dayStats) {
        dayStats[status]++;
      }
    }

    // Calculate completion rates
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

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching monitoring stats:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data monitoring" },
      { status: 500 }
    );
  }
}
