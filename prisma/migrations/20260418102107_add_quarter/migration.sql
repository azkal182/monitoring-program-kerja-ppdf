-- CreateTable
CREATE TABLE "Quarter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quarter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quarter_name_key" ON "Quarter"("name");

-- CreateIndex
CREATE INDEX "Quarter_name_idx" ON "Quarter"("name");
