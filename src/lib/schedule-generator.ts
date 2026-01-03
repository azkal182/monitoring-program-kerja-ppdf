import prisma from "@/lib/prisma";

export async function generateSchedulesForDate(date: Date): Promise<number> {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  // Find all active programs that should run on this day
  const programs = await prisma.program.findMany({
    where: {
      isActive: true,
      scheduleDays: { has: dayOfWeek },
    },
  });

  let createdCount = 0;

  for (const program of programs) {
    // Check if schedule already exists for this date
    const existing = await prisma.scheduleInstance.findUnique({
      where: {
        programId_date: {
          programId: program.id,
          date: dateOnly,
        },
      },
    });

    if (!existing) {
      await prisma.scheduleInstance.create({
        data: {
          programId: program.id,
          date: dateOnly,
        },
      });
      createdCount++;
    }
  }

  return createdCount;
}

export async function getTodaySchedules(divisionId?: string) {
  const today = new Date();
  const dateOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return prisma.scheduleInstance.findMany({
    where: {
      date: dateOnly,
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
