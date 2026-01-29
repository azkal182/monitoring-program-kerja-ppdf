import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { getJakartaDateKey, startOfJakartaDayUtc } from "@/lib/timezone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// === WA Config (pakai ENV, jangan hardcode di production) ===
const BASE_URL_API_WA =
  process.env.BASE_URL_API_WA ?? "https://wa-multi-session.amtsilatipusat.com/api/v1";
const SESSION_ID_WA =
  process.env.SESSION_ID_WA ?? "0b16bdce-a6c9-45ba-bbc4-040607197f18";
const X_API_KEY_WA =
  process.env.X_API_KEY_WA ?? "7640cbef-cf76-4659-a64d-ac37752faa4d";
const PHONE_NUMBER_WA = process.env.PHONE_NUMBER_WA ?? "120363407268999268@g.us";

// === Types ===
type ProgramStatus = "completed" | "issue" | "failed" | "pending";

export interface DailyMonitoringStats {
  date: string;
  overview: {
    totalSchedules: number;
    completed: number;
    completedWithIssue: number;
    notExecuted: number;
    pending: number;
    completionRate: number;
  };
  byDivision: {
    divisionId: string;
    divisionName: string;
    total: number;
    completed: number;
    completedWithIssue: number;
    notExecuted: number;
    pending: number;
    completionRate: number;
    programs: {
      scheduleId: string;
      programId: string;
      programName: string;
      scheduleTime: string | null;
      status: ProgramStatus;
      userId: string | null;
      userName: string | null;
      submittedAt: Date | null;
      sessionId: string | null;
      isAutoCreated: boolean;
    }[];
  }[];
}

export interface DivisionSummary {
  divisionId: string;
  divisionName: string;
  completionRate: number;
  completed: number;
  total: number;
}

// === Helpers ===
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { retries?: number; timeoutMs?: number; backoffMs?: number } = {},
) {
  const retries = opts.retries ?? 3;
  const timeoutMs = opts.timeoutMs ?? 25_000;
  const backoffMs = opts.backoffMs ?? 800;

  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);

      // retry untuk 5xx
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
        continue;
      }

      return res;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;

      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
        continue;
      }
      throw lastErr;
    }
  }

  throw lastErr;
}

function mapSessionStatus(status?: string): ProgramStatus {
  switch (status) {
    case "COMPLETED":
      return "completed";
    case "COMPLETED_WITH_ISSUE":
      return "issue";
    case "NOT_EXECUTED":
      return "failed";
    case "DRAFT":
    default:
      return "pending";
  }
}

function calcRate(done: number, issue: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round(((done + issue) / total) * 100);
}

// === Core ===
async function computeDailyStats({
  dayStart,
  divisionId,
}: {
  dayStart: Date;
  divisionId: string | null;
}): Promise<DailyMonitoringStats> {
  const divisionFilter = divisionId ? { program: { divisionId } } : {};

  const schedules = await prisma.scheduleInstance.findMany({
    where: { date: dayStart, ...divisionFilter },
    select: {
      id: true,
      date: true,
      programId: true,
      program: {
        select: {
          name: true,
          scheduleTime: true,
          divisionId: true,
          division: { select: { name: true } },
        },
      },
      sessions: {
        select: {
          id: true,
          status: true,
          userId: true,
          submittedAt: true,
          isAutoCreated: true,
          user: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { program: { division: { name: "asc" } } },
      { program: { scheduleTime: "asc" } },
      { program: { name: "asc" } },
    ],
  });

  const stats: DailyMonitoringStats = {
    date: getJakartaDateKey(dayStart),
    overview: {
      totalSchedules: 0,
      completed: 0,
      completedWithIssue: 0,
      notExecuted: 0,
      pending: 0,
      completionRate: 0,
    },
    byDivision: [],
  };

  const divisionMap = new Map<string, DailyMonitoringStats["byDivision"][number]>();

  for (const schedule of schedules) {
    const divId = schedule.program.divisionId;
    const divName = schedule.program.division.name;

    const session = schedule.sessions[0];
    const status = mapSessionStatus(session?.status);

    // overview
    stats.overview.totalSchedules++;
    if (status === "completed") stats.overview.completed++;
    else if (status === "issue") stats.overview.completedWithIssue++;
    else if (status === "failed") stats.overview.notExecuted++;
    else stats.overview.pending++;

    // per-division init
    if (!divisionMap.has(divId)) {
      divisionMap.set(divId, {
        divisionId: divId,
        divisionName: divName,
        total: 0,
        completed: 0,
        completedWithIssue: 0,
        notExecuted: 0,
        pending: 0,
        completionRate: 0,
        programs: [],
      });
    }

    const divStats = divisionMap.get(divId)!;
    divStats.total++;

    if (status === "completed") divStats.completed++;
    else if (status === "issue") divStats.completedWithIssue++;
    else if (status === "failed") divStats.notExecuted++;
    else divStats.pending++;

    divStats.programs.push({
      scheduleId: schedule.id,
      programId: schedule.programId,
      programName: schedule.program.name,
      scheduleTime: schedule.program.scheduleTime,
      status,
      userId: session?.userId ?? null,
      userName: session?.user?.name ?? null,
      submittedAt: session?.submittedAt ?? null,
      sessionId: session?.id ?? null,
      isAutoCreated: session?.isAutoCreated ?? false,
    });
  }

  stats.overview.completionRate = calcRate(
    stats.overview.completed,
    stats.overview.completedWithIssue,
    stats.overview.totalSchedules,
  );

  for (const divStats of divisionMap.values()) {
    divStats.completionRate = calcRate(
      divStats.completed,
      divStats.completedWithIssue,
      divStats.total,
    );
  }

  stats.byDivision = Array.from(divisionMap.values()).sort((a, b) =>
    a.divisionName.localeCompare(b.divisionName),
  );

  return stats;
}

function summarizeByDivision(stats: DailyMonitoringStats): DivisionSummary[] {
  return stats.byDivision.map((div) => ({
    divisionId: div.divisionId,
    divisionName: div.divisionName,
    completionRate: div.completionRate, // sudah integer 0..100
    completed: div.completed,
    total: div.total,
  }));
}

export function buildWhatsappDailySummaryMessage(
  stats: DailyMonitoringStats,
  summaries: DivisionSummary[],
): string {
  const header = ["📊 *Monitoring Harian Program Kerja*", `📅 ${stats.date}`, ""].join("\n\n");

  const body = summaries
    .map((s) => [`*${s.divisionName}*`, `• Progress: ${s.completionRate}% (${s.completed}/${s.total})`, ""].join("\n"))
    .join("\n");

  const footer = ["", `Total Departemen: ${summaries.length}`, "*_Pesan ini dibuat otomatis oleh sistem monitoring_*"].join("\n");

  return header + body + footer;
}

async function sendWhatsappMessage(message: string) {
  const url = `${BASE_URL_API_WA}/sessions/${SESSION_ID_WA}/send`;

  const res = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": X_API_KEY_WA,
      },
      body: JSON.stringify({ to: PHONE_NUMBER_WA, message }),
    },
    { retries: 3, timeoutMs: 25_000 },
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`WA send failed: ${res.status} ${text}`);
  }

  // kalau API balas JSON, ini bisa kamu parse
  return text;
}

// === Route ===
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date"); // YYYY-MM-DD

    let targetDate = new Date();
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD" },
          { status: 400 },
        );
      }
      targetDate = parsed;
    }

    const dayStart = startOfJakartaDayUtc(targetDate);
    const divisionId: string | null = null;

    const dateKey = getJakartaDateKey(dayStart);
    const cacheKey = `daily:${dateKey}:${divisionId ?? "all"}`;

    const getStats = unstable_cache(
      () => computeDailyStats({ dayStart, divisionId }),
      ["monitoring-daily", cacheKey],
      { revalidate: 60 },
    );

    const stats = await getStats();

    const summaries = summarizeByDivision(stats);
    const whatsappMessage = buildWhatsappDailySummaryMessage(stats, summaries);

    // kirim WA
    const waResponse = await sendWhatsappMessage(whatsappMessage);

    return NextResponse.json({ ok: true, stats, waResponse });
  } catch (error) {
    console.error("Error sent-report:", error);
    return NextResponse.json(
      { error: "Gagal memproses / mengirim report" },
      { status: 500 },
    );
  }
}
