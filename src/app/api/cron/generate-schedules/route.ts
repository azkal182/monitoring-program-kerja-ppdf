import { NextRequest, NextResponse } from "next/server";
import { generateSchedulesForDate } from "@/lib/schedule-generator";
import {
  APP_TIME_ZONE,
  getJakartaDateKey,
  startOfJakartaDayUtc,
} from "@/lib/timezone";
import { assertCronAuth } from "@/lib/cron";
import { notifyCronSuccess, notifyCronFailure } from "@/lib/telegram";

// This endpoint should be called daily at 00:30 Asia/Jakarta.
// Note: Vercel cron uses UTC, so 00:30 WIB is 17:30 UTC (previous day).
export async function GET(request: NextRequest) {
  try {
    const unauthorized = assertCronAuth(request);
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const DATE_PARAM_REGEX = /^\d{4}-\d{2}-\d{2}$/;

    if (dateParam && !DATE_PARAM_REGEX.test(dateParam)) {
      return NextResponse.json(
        { error: "Invalid date format. Use yyyy-mm-dd" },
        { status: 400 }
      );
    }

    const targetDate = dateParam ? startOfJakartaDayUtc(dateParam) : new Date();
    const jakartaDateKey = getJakartaDateKey(targetDate);
    const count = await generateSchedulesForDate(targetDate);
    const dayLabel = targetDate.toLocaleDateString("id-ID", {
      weekday: "long",
      timeZone: APP_TIME_ZONE,
    });

    // Send Telegram notification
    await notifyCronSuccess("Generate Schedules", {
      Date: jakartaDateKey,
      "Schedules Created": count,
      Day: dayLabel,
    });

    return NextResponse.json({
      success: true,
      message: `Generated ${count} schedule instances for Jakarta date: ${jakartaDateKey}`,
      count,
      jakartaDate: jakartaDateKey,
    });
  } catch (error) {
    console.error("Error generating schedules:", error);

    // Send failure notification
    await notifyCronFailure(
      "Generate Schedules",
      error instanceof Error ? error.message : "Unknown error",
      {
        "Error Type": error instanceof Error ? error.name : "Unknown",
      },
    );

    return NextResponse.json(
      { error: "Failed to generate schedules" },
      { status: 500 },
    );
  }
}
