import { NextResponse } from "next/server";
import { generateSchedulesForDate } from "@/lib/schedule-generator";

// This endpoint should be called by a cron job daily
// In Vercel, set up cron: @daily to call this endpoint
export async function GET() {
  try {
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
