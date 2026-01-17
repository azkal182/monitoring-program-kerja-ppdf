import { NextRequest, NextResponse } from "next/server";
import { generateSchedulesForDate } from "@/lib/schedule-generator";
import { assertCronAuth } from "@/lib/cron";
import { toJakartaDate, getJakartaDateKey } from "@/lib/timezone";

// This endpoint should be called daily at 00:30 Asia/Jakarta.
// Note: Vercel cron uses UTC, so 00:30 WIB is 17:30 UTC (previous day).
export async function GET(request: NextRequest) {
  try {
    const unauthorized = assertCronAuth(request);
    if (unauthorized) return unauthorized;

    // Explicitly get current date in Jakarta timezone
    const jakartaNow = toJakartaDate();
    const count = await generateSchedulesForDate(jakartaNow);

    return NextResponse.json({
      success: true,
      message: `Generated ${count} schedule instances for Jakarta date: ${getJakartaDateKey(jakartaNow)}`,
      count,
      jakartaDate: getJakartaDateKey(jakartaNow),
    });
  } catch (error) {
    console.error("Error generating schedules:", error);
    return NextResponse.json(
      { error: "Failed to generate schedules" },
      { status: 500 },
    );
  }
}
