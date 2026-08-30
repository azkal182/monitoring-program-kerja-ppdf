import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const subscriptionSchema = z.object({
  endpoint: z.string().min(1),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  expirationTime: z.number().nullable().optional(),
  deviceId: z.string().min(1).optional(),
});

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") ?? "self";

  if (scope === "admin") {
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - requires prisma generate after schema change
    const subscriptions = await prisma.pushSubscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            division: {
              select: { name: true },
            },
          },
        },
      },
    });

    const total = subscriptions.length;
    const byUser = subscriptions.reduce<Record<string, { count: number; userId: string; name: string; username: string; divisionName: string | null }>>(
      (acc, sub) => {
        if (!sub.user) return acc;
        const key = sub.user.id;
        if (!acc[key]) {
          acc[key] = {
            userId: sub.user.id,
            name: sub.user.name,
            username: sub.user.username,
            divisionName: sub.user.division?.name ?? null,
            count: 0,
          };
        }
        acc[key].count += 1;
        return acc;
      },
      {}
    );

    return NextResponse.json({
      total,
      subscribers: Object.values(byUser).sort((a, b) => a.name.localeCompare(b.name, "id-ID")),
    });
  }

  // default: return summary for current user
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const personalSubscriptions = await prisma.pushSubscription.findMany({
    where: { userId: session.user.id },
    select: { endpoint: true },
  });

  return NextResponse.json({
    count: personalSubscriptions.length,
    subscribed: personalSubscriptions.length > 0,
  });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawPayload =
    json && typeof json === "object" && json !== null && "subscription" in json
      ? (json as { subscription: unknown; deviceId?: string }).subscription
      : json;

  const rawDeviceId =
    json && typeof json === "object" && json !== null && "deviceId" in json
      ? String((json as { deviceId?: unknown }).deviceId ?? "").trim()
      : "";

  const parseResult = subscriptionSchema.safeParse(rawPayload);

  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
  }

  const subscription = parseResult.data;
  const normalizedDeviceId = rawDeviceId || subscription.deviceId?.trim() || undefined;

  try {
    const payload = {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      authKey: subscription.keys.auth,
      expirationTime: subscription.expirationTime
        ? new Date(subscription.expirationTime)
        : null,
      userId: session.user.id,
      deviceId: normalizedDeviceId,
      isActive: true,
      lastSeenAt: new Date(),
    };

    if (normalizedDeviceId) {
      await (prisma.pushSubscription as any).updateMany({
        where: {
          deviceId: normalizedDeviceId,
          userId: { not: session.user.id },
          isActive: true,
        },
        data: {
          isActive: false,
          userId: null,
          updatedAt: new Date(),
        },
      });
    }

    // Prisma type definitions might require regeneration after schema change.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: payload,
      update: {
        ...payload,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to store push subscription", error);
    return NextResponse.json({ error: "Failed to store subscription" }, { status: 500 });
  }
}

const deleteSchema = z.object({
  endpoint: z.string().min(1).optional(),
  deviceId: z.string().min(1).optional(),
});

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parseResult = deleteSchema.safeParse(json);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { endpoint, deviceId } = parseResult.data;

  try {
    if (endpoint) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await prisma.pushSubscription.delete({
        where: { endpoint },
      });
    }

    if (deviceId) {
      await (prisma.pushSubscription as any).deleteMany({
        where: {
          deviceId,
          userId: session.user.id,
        },
      });
    }
  } catch {
    // ignore missing entries
  }

  return NextResponse.json({ success: true });
}
