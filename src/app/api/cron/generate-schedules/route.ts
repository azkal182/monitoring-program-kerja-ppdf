import { NextRequest, NextResponse } from "next/server";
import { generateSchedulesForDate } from "@/lib/schedule-generator";
import { getJakartaDateKey, toJakartaDate } from "@/lib/timezone";
import { assertCronAuth } from "@/lib/cron";
import { notifyCronSuccess, notifyCronFailure } from "@/lib/telegram";

// This endpoint should be called daily at 00:30 Asia/Jakarta.
// Note: Vercel cron uses UTC, so 00:30 WIB is 17:30 UTC (previous day).
export async function GET(request: NextRequest) {
  try {
    const unauthorized = assertCronAuth(request);
    if (unauthorized) return unauthorized;

    // Explicitly get current date in Jakarta timezone
    const jakartaNow = toJakartaDate();
    const jakartaDateKey = getJakartaDateKey(jakartaNow);

    const count = await generateSchedulesForDate(jakartaNow);

    // Send Telegram notification
    await notifyCronSuccess("Generate Schedules", {
      Date: jakartaDateKey,
      "Schedules Created": count,
      Day: jakartaNow.toLocaleDateString("id-ID", { weekday: "long" }),
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
