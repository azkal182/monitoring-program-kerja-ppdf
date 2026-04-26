import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateIntegration } from "@/lib/integration-auth";
import { getJakartaDateKey, startOfJakartaDayUtc } from "@/lib/timezone";

const DATE_PARAM_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ divisionId: string }> },
) {
  try {
    const { divisionId } = await params;

    const auth = authenticateIntegration(request, divisionId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    if (dateParam && !DATE_PARAM_REGEX.test(dateParam)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 },
      );
    }

    const dateKey = dateParam ?? getJakartaDateKey(new Date());
    const dateUtc = startOfJakartaDayUtc(dateKey);

    const schedules = await prisma.scheduleInstance.findMany({
      where: {
        date: dateUtc,
        program: { divisionId },
      },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            scheduleTime: true,
            requirementType: true,
            minUploads: true,
            divisionId: true,
            division: { select: { id: true, name: true } },
          },
        },
        sessions: {
          include: {
            user: { select: { id: true, name: true, username: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: [{ program: { scheduleTime: "asc" } }, { program: { name: "asc" } }],
    });

    const response = schedules.map((schedule) => {
      const session = schedule.sessions[0] ?? null;
      return {
        scheduleId: schedule.id,
        date: getJakartaDateKey(schedule.date),
        program: schedule.program,
        session: session
          ? {
              id: session.id,
              status: session.status,
              user: session.user,
              submittedAt: session.submittedAt,
              isAutoCreated: session.isAutoCreated,
            }
          : null,
      };
    });

    return NextResponse.json({
      divisionId,
      date: dateKey,
      integrationClient: auth.clientName,
      count: response.length,
      schedules: response,
    });
  } catch (error) {
    console.error("Integration schedules API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 },
    );
  }
}
