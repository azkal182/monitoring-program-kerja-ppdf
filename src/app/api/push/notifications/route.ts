import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getWebPush } from "@/lib/push";

const payloadSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(512),
  url: z.string().url().optional(),
  audience: z.enum(["all", "user"]),
  userId: z.string().cuid().optional(),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parseResult = payloadSchema.safeParse(json);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { title, body, url, audience, userId } = parseResult.data;

  if (audience === "user" && !userId) {
    return NextResponse.json(
      { error: "userId is required when audience is 'user'" },
      { status: 400 }
    );
  }

  type StoredSubscription = {
    endpoint: string;
    p256dh: string;
    authKey: string;
  };

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - generated types need update after prisma migrate
  const rawSubscriptions = await prisma.pushSubscription.findMany({
    where: audience === "all" ? {} : { userId },
  });

  const subscriptions = rawSubscriptions as StoredSubscription[];

  if (subscriptions.length === 0) {
    return NextResponse.json(
      { success: false, message: "No push subscriptions available" },
      { status: 404 }
    );
  }

  const webpush = getWebPush();

  let successCount = 0;
  let failureCount = 0;

  await Promise.all(
    subscriptions.map(async (subscription: StoredSubscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.authKey,
            },
          },
          JSON.stringify({
            title,
            body,
            url,
          })
        );
        successCount += 1;
      } catch (error: unknown) {
        failureCount += 1;
        if (
          error &&
          typeof error === "object" &&
          "statusCode" in error &&
          ((error as { statusCode?: number }).statusCode === 410 ||
            (error as { statusCode?: number }).statusCode === 404)
        ) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await prisma.pushSubscription.delete({
            where: { endpoint: subscription.endpoint },
          });
        } else {
          console.error("Failed to send push notification", error);
        }
      }
    })
  );

  return NextResponse.json({ success: true, successCount, failureCount });
}
