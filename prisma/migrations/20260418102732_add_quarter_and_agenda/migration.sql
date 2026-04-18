-- CreateTable
CREATE TABLE "Agenda" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shade" TEXT NOT NULL,
    "personResponsible" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "completed" BOOLEAN DEFAULT false,
    "quarterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agenda_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_quarterId_fkey" FOREIGN KEY ("quarterId") REFERENCES "Quarter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
