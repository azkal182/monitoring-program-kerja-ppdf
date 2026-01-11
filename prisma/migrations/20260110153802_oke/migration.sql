/*
  Warnings:

  - Added the required column `storagePath` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storagePath` to the `Photo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "storagePath" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "storagePath" TEXT NOT NULL;
