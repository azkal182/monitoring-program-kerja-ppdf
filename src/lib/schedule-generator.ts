import prisma from "@/lib/prisma";
import { ScheduleType } from "@prisma/client";
import {
  getJakartaDateKey,
  startOfJakartaDayUtc,
  toJakartaDate,
} from "@/lib/timezone";

export async function generateSchedulesForDate(date: Date): Promise<number> {
  const jakartaDate = toJakartaDate(date);
  const dayOfWeek = jakartaDate.getDay();
  const dayOfMonth = jakartaDate.getDate();
  const dateKey = getJakartaDateKey(jakartaDate);
  const dateUtc = startOfJakartaDayUtc(jakartaDate);

  // Find all active programs
  const programs = await prisma.program.findMany({
    where: {
      isActive: true,
    },
  });

  let createdCount = 0;

  for (const program of programs) {
    let shouldCreateSchedule = false;

    switch (program.scheduleType) {
      case ScheduleType.DAILY:
        // Check if today's day of week is in scheduleDays
        shouldCreateSchedule = program.scheduleDays.includes(dayOfWeek);
        break;

      case ScheduleType.WEEKLY:
        // Same as daily - check day of week
        shouldCreateSchedule = program.scheduleDays.includes(dayOfWeek);
        break;

      case ScheduleType.MONTHLY:
        // Check if today's day of month is in scheduleMonthDays
        shouldCreateSchedule = program.scheduleMonthDays.includes(dayOfMonth);
        break;

      case ScheduleType.CUSTOM:
        // Check if today matches any of the custom dates
        shouldCreateSchedule = program.customDates.some((customDate) => {
          return getJakartaDateKey(customDate) === dateKey;
        });
        break;
    }

    if (!shouldCreateSchedule) continue;

    // Check if schedule already exists for this date
    const existing = await prisma.scheduleInstance.findUnique({
      where: {
        programId_date: {
          programId: program.id,
          date: dateUtc,
        },
      },
    });

    if (!existing) {
      await prisma.scheduleInstance.create({
        data: {
          programId: program.id,
          date: dateUtc,
        },
      });
      createdCount++;
      console.log(`Created schedule for "${program.name}" on ${dateKey}`);
    }
  }

  return createdCount;
}

export async function getTodaySchedules(divisionId?: string) {
  const todayUtc = startOfJakartaDayUtc();

  return prisma.scheduleInstance.findMany({
    where: {
      date: todayUtc,
      ...(divisionId && { program: { divisionId } }),
    },
    include: {
      program: {
        include: { division: true },
      },
      sessions: {
        include: {
          user: { select: { id: true, name: true } },
          photos: true,
        },
      },
    },
    orderBy: { program: { scheduleTime: "asc" } },
  });
}
