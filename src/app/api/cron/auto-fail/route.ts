import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getJakartaDateKey, startOfJakartaDayUtc } from "@/lib/timezone";

// This endpoint should be called daily at 23:59 Asia/Jakarta.
// Note: Vercel cron uses UTC, so 23:59 WIB is 16:59 UTC.
export async function GET() {
  try {
    const dateOnly = startOfJakartaDayUtc();
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
          include: { division: true },
        },
      },
    });

    let failedCount = 0;

    for (const schedule of schedulesWithoutSession) {
      // Check if there's already an auto-created session
      const existingAutoSession = await prisma.session.findFirst({
        where: {
          scheduleId: schedule.id,
          isAutoCreated: true,
        },
      });

      if (!existingAutoSession) {
        // Find the koordinator of the division to assign the auto-fail session
        const koordinator = await prisma.user.findFirst({
          where: {
            divisionId: schedule.program.divisionId,
            role: "KOORDINATOR",
          },
        });

        // If no koordinator, try to find any user in the division
        const assignedUser =
          koordinator ||
          (await prisma.user.findFirst({
            where: { divisionId: schedule.program.divisionId },
          }));

        if (assignedUser) {
          await prisma.session.create({
            data: {
              scheduleId: schedule.id,
              userId: assignedUser.id,
              status: "NOT_EXECUTED",
              isAutoCreated: true,
              issueNote: "Tidak ada laporan yang disubmit",
              submittedAt: new Date(),
            },
          });
          failedCount++;
        }
      }
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
      { status: 500 }
    );
  }
}
