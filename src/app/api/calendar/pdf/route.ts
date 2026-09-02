import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ScheduleType } from "@/generated/prisma/enums";
import {
  toJakartaDate,
  formatInJakarta,
  getJakartaDateKey,
} from "@/lib/timezone";
import { endOfMonth, startOfMonth, getDaysInMonth } from "date-fns";
import { renderCalendarPdf, CalendarPdfEvent } from "@/server/calendar-pdf";

const MONTH_PARAM_REGEX = /^\d{4}-\d{2}$/;

export const runtime = "nodejs";

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
        return new Date(Date.UTC(year, month - 1, 1, 12));
      }
      return new Date();
    })();

    const jakartaTarget = toJakartaDate(targetDate);
    const monthStart = startOfMonth(jakartaTarget);
    const monthKey = formatInJakarta(monthStart, "yyyy-MM");
    const daysInMonth = getDaysInMonth(jakartaTarget);

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
    });

    const eventsByDate = new Map<string, CalendarPdfEvent[]>();

    for (const program of programs) {
      const eventDates = new Set<string>();

      switch (program.scheduleType) {
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
      }

      if (eventDates.size === 0) continue;

      const baseEvent: CalendarPdfEvent = {
        programName: program.name,
        divisionName: program.division.name,
        scheduleType: program.scheduleType,
        scheduleTime: program.scheduleTime,
      };

      for (const dateKey of Array.from(eventDates)) {
        const existing = eventsByDate.get(dateKey) ?? [];
        existing.push(baseEvent);
        eventsByDate.set(dateKey, existing);
      }
    }

    const agendas = await prisma.agenda.findMany({
      where: {
        date: {
          startsWith: monthKey
        }
      }
    });

    for (const agenda of agendas) {
      const dateKey = agenda.date;
      const baseEvent: CalendarPdfEvent = {
        programName: agenda.name,
        divisionName: "Agenda Organisasi",
        scheduleType: "AGENDA",
        scheduleTime: null,
      };

      const existing = eventsByDate.get(dateKey) ?? [];
      existing.push(baseEvent);
      eventsByDate.set(dateKey, existing);
    }

    const sortedEventsByDate: Record<string, CalendarPdfEvent[]> = {};
    const sortedDates = Array.from(eventsByDate.keys()).sort();
    
    for (const dateKey of sortedDates) {
      const events = eventsByDate.get(dateKey) || [];
      sortedEventsByDate[dateKey] = events.sort((a, b) => {
        if (a.divisionName === b.divisionName) {
          return a.programName.localeCompare(b.programName);
        }
        return a.divisionName.localeCompare(b.divisionName);
      });
    }

    const pdf = await renderCalendarPdf({
      monthStart,
      eventsByDate: sortedEventsByDate,
      generatedBy: session.user.name ?? "Sistem",
      generatedAt: new Date(),
    });

    const fileName = `kalender-program-${monthKey}.pdf`;
    const body = new Blob([new Uint8Array(pdf)], { type: "application/pdf" });

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating calendar PDF:", error);
    return NextResponse.json(
      { error: "Gagal membuat PDF kalender program" },
      { status: 500 }
    );
  }
}
