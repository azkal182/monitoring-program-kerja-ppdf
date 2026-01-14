import { NextRequest, NextResponse } from "next/server";

export function assertCronAuth(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!token || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
