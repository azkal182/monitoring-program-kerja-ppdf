import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  computeMonitoringStats,
  resolveMonthlyReportRange,
} from "@/lib/monitoring-stats";
import { renderMonthlyReportPdf } from "@/lib/monthly-report-pdf";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN" && !session.user.divisionId) {
    return NextResponse.json(
      { error: "User belum memiliki divisi" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  const {
    monthStart,
    monthStartJakarta,
    reportEnd,
    reportEndJakarta,
    monthKey,
    hasCompletedDays,
    isPartialPeriod,
  } = resolveMonthlyReportRange(monthParam);
  const divisionId =
    session.user.role === "ADMIN" ? null : session.user.divisionId;
  const scopeLabel =
    session.user.role === "ADMIN"
      ? "Semua Divisi"
      : session.user.divisionName ?? "Divisi Koordinator";

  const stats = await computeMonitoringStats({
    monthStart,
    monthEnd: reportEnd,
    monthStartJakarta,
    monthEndJakarta: reportEndJakarta,
    divisionId,
  });

  const pdf = await renderMonthlyReportPdf({
    stats,
    monthStart,
    reportEnd,
    hasCompletedDays,
    isPartialPeriod,
    scopeLabel,
    generatedBy: session.user.name,
    generatedAt: new Date(),
  });
  const fileName = `laporan-monitoring-${monthKey}.pdf`;

  const body = new Blob([new Uint8Array(pdf)], { type: "application/pdf" });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
