-- AlterTable
ALTER TABLE "ScheduleInstance" ADD COLUMN "reminderSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ScheduleInstance_reminderSentAt_idx" ON "ScheduleInstance"("reminderSentAt");
