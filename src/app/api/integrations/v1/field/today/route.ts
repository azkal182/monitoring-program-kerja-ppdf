import { NextRequest, NextResponse } from "next/server";
import { generateSchedulesForDate, getTodaySchedules } from "@/lib/schedule-generator";
import {
  authenticateIntegrationClient,
  resolveIntegrationDivision,
} from "@/lib/integration-auth";

export async function GET(request: NextRequest) {
  try {
    const integrationClient = authenticateIntegrationClient(request);
    if (!integrationClient.ok) {
      return NextResponse.json(
        { error: integrationClient.error },
        { status: integrationClient.status },
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedDivisionId = searchParams.get("divisionId");
    const resolvedDivision = resolveIntegrationDivision(
      requestedDivisionId,
      integrationClient.divisionIds,
    );

    if (!resolvedDivision.ok) {
      return NextResponse.json(
        { error: resolvedDivision.error },
        { status: resolvedDivision.status },
      );
    }

    await generateSchedulesForDate(new Date());
    const schedules = await getTodaySchedules(resolvedDivision.divisionId);

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Integration field/today API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 },
    );
  }
}
