import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import prisma from "@/lib/prisma";
import { assertCronAuth } from "@/lib/cron";
import {
  APP_TIME_ZONE,
  endOfJakartaDayUtc,
  formatInJakarta,
  getJakartaDateKey,
  startOfJakartaDayUtc,
} from "@/lib/timezone";
import { sendTelegramNotification, notifyCronFailure } from "@/lib/telegram";

export async function GET(request: NextRequest) {
  try {
    const unauthorized = assertCronAuth(request);
    if (unauthorized) return unauthorized;

    const todayKey = getJakartaDateKey(new Date());
    const baseDate = new Date(`${todayKey}T12:00:00Z`);
    const endKey = getJakartaDateKey(addDays(baseDate, 3));

    const startDate = startOfJakartaDayUtc(todayKey);
    const endDate = endOfJakartaDayUtc(endKey);

    const deadlines = await prisma.deadline.findMany({
      where: {
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { division: { select: { name: true } } },
      orderBy: [{ dueDate: "asc" }, { title: "asc" }],
    });

    if (deadlines.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No deadlines within H-3 range",
      });
    }

    const today = startOfJakartaDayUtc(todayKey);
    const lines = deadlines.map((deadline) => {
      const dueKey = getJakartaDateKey(deadline.dueDate);
      const diffMs = startOfJakartaDayUtc(dueKey).getTime() - today.getTime();
      const diffDays = Math.round(diffMs / 86400000);
      const hLabel = diffDays === 0 ? "H" : `H-${diffDays}`;
      const divisionLabel = deadline.division?.name ?? "Umum";
      return `• ${formatInJakarta(deadline.dueDate, "dd MMM")}: ${deadline.title} (${divisionLabel}) - ${hLabel}`;
    });

    await sendTelegramNotification({
      title: "Pengingat Deadline (H-3)",
      message: lines.join("\n"),
      status: "warning",
      context: {
        Range: `${todayKey} s/d ${endKey}`,
        Total: deadlines.length,
        Timezone: APP_TIME_ZONE,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Sent ${deadlines.length} deadline reminders`,
      count: deadlines.length,
      range: { start: todayKey, end: endKey },
    });
  } catch (error) {
    console.error("Error sending deadline reminders:", error);

    await notifyCronFailure(
      "Deadline Reminder",
      error instanceof Error ? error.message : "Unknown error",
      {
        "Error Type": error instanceof Error ? error.name : "Unknown",
      }
    );

    return NextResponse.json(
      { error: "Failed to send deadline reminders" },
      { status: 500 }
    );
  }
}
