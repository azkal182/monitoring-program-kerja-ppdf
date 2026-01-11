/*
  Warnings:

  - You are about to drop the column `minPhotos` on the `Program` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ProgramRequirementType" AS ENUM ('PHOTO', 'DOCUMENT');

-- AlterTable
ALTER TABLE "Program" DROP COLUMN "minPhotos",
ADD COLUMN     "customDates" TIMESTAMP(3)[],
ADD COLUMN     "minUploads" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "requirementType" "ProgramRequirementType" NOT NULL DEFAULT 'PHOTO',
ADD COLUMN     "scheduleMonthDays" INTEGER[];

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
