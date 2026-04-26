import prisma from "@/lib/prisma";

export async function pickDivisionAssignee(divisionId: string) {
  const coordinator = await prisma.user.findFirst({
    where: { divisionId, role: "KOORDINATOR" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (coordinator) {
    return coordinator.id;
  }

  const fallback = await prisma.user.findFirst({
    where: { divisionId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  return fallback?.id ?? null;
}
