import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// This endpoint should be called by a cron job at night (e.g., 23:59)
// In Vercel, set up cron: 59 23 * * * to call this endpoint
export async function GET() {
  try {
    const today = new Date();
    const dateOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

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
      date: dateOnly.toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Error running auto-fail:", error);
    return NextResponse.json(
      { error: "Failed to run auto-fail mechanism" },
      { status: 500 }
    );
  }
}
