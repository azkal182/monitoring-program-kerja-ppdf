import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { assertCronAuth } from "@/lib/cron";
import { getWebPush } from "@/lib/push";
import {
  APP_TIME_ZONE,
  formatInJakarta,
  getJakartaDateKey,
  startOfJakartaDayUtc,
} from "@/lib/timezone";
import { generateSchedulesForDate } from "@/lib/schedule-generator";
import { notifyCronFailure, notifyCronSuccess } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ScheduleReminderRow = {
  scheduleId: string;
  programName: string;
  scheduleTime: string;
  divisionId: string;
  divisionName: string;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  authKey: string;
  userId: string;
};

function getPositiveIntegerEnv(name: string, defaultValue: number) {
  const value = process.env[name];
  if (!value) return defaultValue;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
}

function parseTimeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function isWithinReminderWindow(scheduleTime: string, now: Date) {
  const leadMinutes = getPositiveIntegerEnv("SCHEDULE_REMINDER_LEAD_MINUTES", 30);
  const lateToleranceMinutes = getPositiveIntegerEnv(
    "SCHEDULE_REMINDER_LATE_TOLERANCE_MINUTES",
    5,
  );
  const scheduleMinutes = parseTimeToMinutes(scheduleTime);
  if (scheduleMinutes === null) return false;

  const nowMinutes =
    Number(formatInJakarta(now, "H")) * 60 + Number(formatInJakarta(now, "m"));

  return (
    scheduleMinutes >= nowMinutes - lateToleranceMinutes &&
    scheduleMinutes <= nowMinutes + leadMinutes
  );
}

async function getPendingScheduleReminders(date: Date) {
  return prisma.$queryRaw<ScheduleReminderRow[]>`
    SELECT
      s."id" AS "scheduleId",
      p."name" AS "programName",
      p."scheduleTime" AS "scheduleTime",
      p."divisionId" AS "divisionId",
      d."name" AS "divisionName"
    FROM "ScheduleInstance" s
    INNER JOIN "Program" p ON p."id" = s."programId"
    INNER JOIN "Division" d ON d."id" = p."divisionId"
    WHERE s."date" = ${date}
      AND s."reminderSentAt" IS NULL
      AND p."isActive" = true
      AND p."scheduleTime" IS NOT NULL
    ORDER BY p."scheduleTime" ASC, p."name" ASC
  `;
}

async function getDivisionSubscriptions(divisionId: string) {
  return prisma.$queryRaw<PushSubscriptionRow[]>`
    SELECT
      ps."id",
      ps."endpoint",
      ps."p256dh",
      ps."authKey",
      ps."userId"
    FROM "PushSubscription" ps
    INNER JOIN "User" u ON u."id" = ps."userId"
    WHERE u."divisionId" = ${divisionId}
  `;
}

async function markReminderSent(scheduleId: string, sentAt: Date) {
  await prisma.$executeRaw`
    UPDATE "ScheduleInstance"
    SET "reminderSentAt" = ${sentAt}
    WHERE "id" = ${scheduleId}
      AND "reminderSentAt" IS NULL
  `;
}

export async function GET(request: NextRequest) {
  try {
    const unauthorized = assertCronAuth(request);
    if (unauthorized) return unauthorized;

    const now = new Date();
    const dateKey = getJakartaDateKey(now);
    const todayUtc = startOfJakartaDayUtc(now);

    await generateSchedulesForDate(now);

    const pendingSchedules = await getPendingScheduleReminders(todayUtc);
    const dueSchedules = pendingSchedules.filter((schedule) =>
      isWithinReminderWindow(schedule.scheduleTime, now),
    );

    if (dueSchedules.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No schedule reminders due",
        date: dateKey,
        timezone: APP_TIME_ZONE,
      });
    }

    const webpush = getWebPush();
    let sentCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (const schedule of dueSchedules) {
      const subscriptions = await getDivisionSubscriptions(schedule.divisionId);

      if (subscriptions.length === 0) {
        skippedCount += 1;
        await markReminderSent(schedule.scheduleId, now);
        continue;
      }

      const payload = JSON.stringify({
        title: "Pengingat Jadwal Program",
        body: `${schedule.programName} (${schedule.divisionName}) dimulai pukul ${schedule.scheduleTime}.`,
        url: "/field/today",
        data: {
          scheduleId: schedule.scheduleId,
          divisionId: schedule.divisionId,
          type: "schedule-reminder",
        },
      });

      await Promise.all(
        subscriptions.map(async (subscription) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: subscription.p256dh,
                  auth: subscription.authKey,
                },
              },
              payload,
            );
            sentCount += 1;
          } catch (error: unknown) {
            failureCount += 1;
            if (
              error &&
              typeof error === "object" &&
              "statusCode" in error &&
              ((error as { statusCode?: number }).statusCode === 410 ||
                (error as { statusCode?: number }).statusCode === 404)
            ) {
              await prisma.pushSubscription.delete({
                where: { endpoint: subscription.endpoint },
              });
            } else {
              console.error("Failed to send schedule reminder", error);
            }
          }
        }),
      );

      await markReminderSent(schedule.scheduleId, now);
    }

    await notifyCronSuccess("Schedule Reminder", {
      Date: dateKey,
      "Due Schedules": dueSchedules.length,
      "Notifications Sent": sentCount,
      Failures: failureCount,
      "No Subscribers": skippedCount,
    });

    return NextResponse.json({
      success: true,
      date: dateKey,
      timezone: APP_TIME_ZONE,
      dueSchedules: dueSchedules.length,
      sentCount,
      failureCount,
      skippedCount,
    });
  } catch (error) {
    console.error("Error sending schedule reminders:", error);

    await notifyCronFailure(
      "Schedule Reminder",
      error instanceof Error ? error.message : "Unknown error",
      {
        "Error Type": error instanceof Error ? error.name : "Unknown",
      },
    );

    return NextResponse.json(
      { error: "Failed to send schedule reminders" },
      { status: 500 },
    );
  }
}
