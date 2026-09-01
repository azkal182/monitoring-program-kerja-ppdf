import prisma from "@/lib/prisma";
import { ScheduleType } from "@/generated/prisma/enums";

import {
  formatInJakarta,
  getJakartaDateKey,
  getJakartaDayIndex,
  startOfJakartaDayUtc,
} from "@/lib/timezone";

export async function generateSchedulesForDate(date: Date): Promise<number> {
  const dayOfWeek = getJakartaDayIndex(date);
  const dayOfMonth = Number(formatInJakarta(date, "d"));
  const dateKey = getJakartaDateKey(date);
  const dateUtc = startOfJakartaDayUtc(date);

  const existingSchedules = await prisma.scheduleInstance.findMany({
    where: { date: dateUtc },
    select: { programId: true },
  });
  const existingProgramIds = new Set(
    existingSchedules.map((schedule) => schedule.programId)
  );

  const programs = await prisma.program.findMany({
    where: {
      isActive: true,
      OR: [
        {
          scheduleType: ScheduleType.DAILY,
          scheduleDays: { has: dayOfWeek },
        },
        {
          scheduleType: ScheduleType.WEEKLY,
          scheduleDays: { has: dayOfWeek },
        },
        {
          scheduleType: ScheduleType.MONTHLY,
          scheduleMonthDays: { has: dayOfMonth },
        },
        {
          scheduleType: ScheduleType.CUSTOM,
        },
      ],
    },
  });

  const createData: { programId: string; date: Date }[] = [];

  for (const program of programs) {
    if (existingProgramIds.has(program.id)) continue;

    if (program.scheduleType === ScheduleType.CUSTOM) {
      const isToday = program.customDates.some(
        (customDate) => getJakartaDateKey(customDate) === dateKey
      );
      if (!isToday) continue;
    }

    createData.push({
      programId: program.id,
      date: dateUtc,
    });
  }

  if (createData.length === 0) {
    return 0;
  }

  const result = await prisma.scheduleInstance.createMany({
    data: createData,
    skipDuplicates: true,
  });

  if (result.count > 0) {
    console.log(`Created ${result.count} schedules for ${dateKey}`);
  }

  return result.count;
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
          documents: true,
        },
      },
    },
    orderBy: { program: { scheduleTime: "asc" } },
  });
}

export async function getSchedulesForDate(
  date: Date | string,
  divisionId?: string
) {
  const dateUtc = startOfJakartaDayUtc(date);

  return prisma.scheduleInstance.findMany({
    where: {
      date: dateUtc,
      ...(divisionId && { program: { divisionId } }),
    },
    include: {
      program: {
        include: { division: true },
      },
      sessions: {
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { program: { scheduleTime: "asc" } },
  });
}
