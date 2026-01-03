import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTodaySchedules } from "@/lib/schedule-generator";
import { generateSchedulesForDate } from "@/lib/schedule-generator";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate schedules for today if not exist
    await generateSchedulesForDate(new Date());

    // Get user's division schedules
    const divisionId = session.user.divisionId || undefined;
    const schedules = await getTodaySchedules(divisionId);

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Error fetching today schedules:", error);
    return NextResponse.json(
      { error: "Gagal mengambil jadwal hari ini" },
      { status: 500 }
    );
  }
}
