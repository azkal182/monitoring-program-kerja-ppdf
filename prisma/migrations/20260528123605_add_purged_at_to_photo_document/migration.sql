-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "purgedAt" TIMESTAMP(3),
ALTER COLUMN "storagePath" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "purgedAt" TIMESTAMP(3),
ALTER COLUMN "storagePath" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Document_purgedAt_idx" ON "Document"("purgedAt");

-- CreateIndex
CREATE INDEX "Photo_purgedAt_idx" ON "Photo"("purgedAt");
