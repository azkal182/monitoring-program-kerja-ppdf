import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unstable_cache } from "next/cache";
import {
  computeMonitoringStats,
  resolveMonthlyMonitoringRange,
} from "@/lib/monitoring-stats";

export type { MonitoringStats } from "@/lib/monitoring-stats";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");
    const {
      monthStart,
      monthEnd,
      monthStartJakarta,
      monthEndJakarta,
      monthKey,
    } = resolveMonthlyMonitoringRange(monthParam);

    const divisionId =
      session.user.role === "ADMIN" ? null : session.user.divisionId!;
    const cacheKey = `${monthKey}:${divisionId ?? "all"}`;

    const getStats = unstable_cache(
      () =>
        computeMonitoringStats({
          monthStart,
          monthEnd,
          monthStartJakarta,
          monthEndJakarta,
          divisionId,
        }),
      ["monitoring", cacheKey],
      { revalidate: 300 }
    );

    const stats = await getStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching monitoring stats:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data monitoring" },
      { status: 500 }
    );
  }
}
