import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSchedulesForDate } from "@/lib/schedule-generator";
import { getJakartaDateKey } from "@/lib/timezone";

const DATE_PARAM_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "ANGGOTA") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const divisionParam = searchParams.get("divisionId");

    if (dateParam && !DATE_PARAM_REGEX.test(dateParam)) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const dateKey = dateParam ?? getJakartaDateKey(new Date());
    const divisionId =
      session.user.role === "ADMIN"
        ? divisionParam ?? undefined
        : session.user.divisionId ?? undefined;

    const schedules = await getSchedulesForDate(dateKey, divisionId);

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json(
      { error: "Gagal mengambil jadwal" },
      { status: 500 }
    );
  }
}
