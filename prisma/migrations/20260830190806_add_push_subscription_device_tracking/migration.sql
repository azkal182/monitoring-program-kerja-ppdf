-- AlterTable
ALTER TABLE "PushSubscription" ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PushSubscription_deviceId_idx" ON "PushSubscription"("deviceId");

-- CreateIndex
CREATE INDEX "PushSubscription_isActive_idx" ON "PushSubscription"("isActive");
