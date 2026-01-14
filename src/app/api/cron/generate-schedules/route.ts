import { NextRequest, NextResponse } from "next/server";
import { generateSchedulesForDate } from "@/lib/schedule-generator";
import { assertCronAuth } from "@/lib/cron";

// This endpoint should be called daily at 00:00 Asia/Jakarta.
// Note: Vercel cron uses UTC, so 00:00 WIB is 17:00 UTC (previous day).
export async function GET(request: NextRequest) {
  try {
    const unauthorized = assertCronAuth(request);
    if (unauthorized) return unauthorized;

    const today = new Date();
    const count = await generateSchedulesForDate(today);

    return NextResponse.json({
      success: true,
      message: `Generated ${count} schedule instances for ${
        today.toISOString().split("T")[0]
      }`,
      count,
    });
  } catch (error) {
    console.error("Error generating schedules:", error);
    return NextResponse.json(
      { error: "Failed to generate schedules" },
      { status: 500 }
    );
  }
}
