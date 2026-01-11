import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  ScheduleType,
  ProgramRequirementType,
} from "@/generated/prisma/enums";
import {
  APP_TIME_ZONE,
  getJakartaDateKey,
  getJakartaDayIndex,
  toJakartaDate,
  formatInJakarta,
} from "@/lib/timezone";
import { eachDayOfInterval, endOfMonth, startOfMonth } from "date-fns";

interface CalendarEvent {
  programId: string;
  programName: string;
  divisionId: string;
  divisionName: string;
  scheduleType: ScheduleType;
  scheduleTime: string | null;
  requirementType: ProgramRequirementType;
  minUploads: number;
}

interface CalendarProgramSummary extends CalendarEvent {
  occurrenceDates: string[];
  scheduleDays: number[];
  scheduleMonthDays: number[];
  customDates: string[];
}

const MONTH_PARAM_REGEX = /^\d{4}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");

    const targetDate = (() => {
      if (monthParam && MONTH_PARAM_REGEX.test(monthParam)) {
        const [year, month] = monthParam.split("-").map(Number);
        // Use noon time to avoid timezone rollover issues
        return new Date(Date.UTC(year, month - 1, 1, 12));
      }
      return new Date();
    })();

    const jakartaTarget = toJakartaDate(targetDate);
    const monthStart = startOfMonth(jakartaTarget);
    const monthEnd = endOfMonth(monthStart);
    const monthKey = formatInJakarta(monthStart, "yyyy-MM");
    const monthStartKey = getJakartaDateKey(monthStart);
    const monthEndKey = getJakartaDateKey(monthEnd);
    const daysInMonthRange = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const daysInMonth = toJakartaDate(monthEnd).getDate();

    const where: Record<string, unknown> = { isActive: true };
    if (session.user.role !== "ADMIN" && session.user.divisionId) {
      where.divisionId = session.user.divisionId;
    }

    const programs = await prisma.program.findMany({
      where,
      include: {
        division: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { division: { name: "asc" } },
        { name: "asc" },
      ],
    });

    const eventsByDate = new Map<string, CalendarEvent[]>();
    const programSummaries: CalendarProgramSummary[] = [];
    let hasDailyPrograms = false;

    for (const program of programs) {
      const eventDates = new Set<string>();

      switch (program.scheduleType) {
        case ScheduleType.DAILY:
        case ScheduleType.WEEKLY: {
          const targetDays = program.scheduleDays ?? [];
          if (targetDays.length === 0) break;

          for (const day of daysInMonthRange) {
            const dayIndex = getJakartaDayIndex(day);
            if (targetDays.includes(dayIndex)) {
              eventDates.add(getJakartaDateKey(day));
            }
          }

          if (program.scheduleType === ScheduleType.DAILY) {
            hasDailyPrograms = true;
          }
          break;
        }
        case ScheduleType.MONTHLY: {
          const monthDays = program.scheduleMonthDays ?? [];
          for (const dayOfMonth of monthDays) {
            if (dayOfMonth >= 1 && dayOfMonth <= daysInMonth) {
              const key = `${monthKey}-${String(dayOfMonth).padStart(2, "0")}`;
              eventDates.add(key);
            }
          }
          break;
        }
        case ScheduleType.CUSTOM: {
          for (const customDate of program.customDates ?? []) {
            const key = getJakartaDateKey(customDate);
            if (key.startsWith(monthKey)) {
              eventDates.add(key);
            }
          }
          break;
        }
        default:
          break;
      }

      if (eventDates.size === 0) {
        continue;
      }

      const sortedDates = Array.from(eventDates).sort();
      const customDates = (program.customDates ?? [])
        .map((date) => getJakartaDateKey(date))
        .filter((date) => date.startsWith(monthKey));

      const baseEvent: CalendarEvent = {
        programId: program.id,
        programName: program.name,
        divisionId: program.divisionId,
        divisionName: program.division.name,
        scheduleType: program.scheduleType,
        scheduleTime: program.scheduleTime,
        requirementType: program.requirementType,
        minUploads: program.minUploads,
      };

      programSummaries.push({
        ...baseEvent,
        occurrenceDates: sortedDates,
        scheduleDays: program.scheduleDays ?? [],
        scheduleMonthDays: program.scheduleMonthDays ?? [],
        customDates,
      });

      for (const dateKey of sortedDates) {
        const existing = eventsByDate.get(dateKey) ?? [];
        existing.push(baseEvent);
        eventsByDate.set(dateKey, existing);
      }
    }

    // Sort events within each date for deterministic order
    const sortedEventsByDate: Record<string, CalendarEvent[]> = {};
    for (const [dateKey, events] of eventsByDate.entries()) {
      sortedEventsByDate[dateKey] = events.sort((a, b) => {
        if (a.divisionName === b.divisionName) {
          return a.programName.localeCompare(b.programName);
        }
        return a.divisionName.localeCompare(b.divisionName);
      });
    }

    return NextResponse.json({
      month: monthKey,
      monthLabel: formatInJakarta(monthStart, "MMMM yyyy"),
      timezone: APP_TIME_ZONE,
      startDate: monthStartKey,
      endDate: monthEndKey,
      eventsByDate: sortedEventsByDate,
      programs: programSummaries,
      hasDailyPrograms,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating calendar data:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data kalender program" },
      { status: 500 }
    );
  }
}
