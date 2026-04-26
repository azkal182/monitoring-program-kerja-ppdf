import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateIntegration } from "@/lib/integration-auth";
import { integrationReportSchema } from "@/lib/validations/integration";

async function pickDivisionAssignee(divisionId: string) {
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ divisionId: string }> },
) {
  try {
    const { divisionId } = await params;

    const auth = authenticateIntegration(request, divisionId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const raw = await request.json();
    const parsed = integrationReportSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const payload = parsed.data;

    const schedule = await prisma.scheduleInstance.findUnique({
      where: { id: payload.scheduleId },
      include: {
        program: {
          select: {
            id: true,
            divisionId: true,
            requirementType: true,
            minUploads: true,
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    if (schedule.program.divisionId !== divisionId) {
      return NextResponse.json(
        { error: "Schedule does not belong to requested division" },
        { status: 403 },
      );
    }

    const assigneeUserId = await pickDivisionAssignee(divisionId);
    if (!assigneeUserId) {
      return NextResponse.json(
        { error: "No user available in this division to own the session" },
        { status: 422 },
      );
    }

    let session = await prisma.session.findFirst({
      where: { scheduleId: payload.scheduleId },
      include: {
        photos: true,
        documents: true,
      },
    });

    if (!session) {
      session = await prisma.session.create({
        data: {
          scheduleId: payload.scheduleId,
          userId: assigneeUserId,
          status: "DRAFT",
          isAutoCreated: true,
        },
        include: {
          photos: true,
          documents: true,
        },
      });
    }

    if (session.status !== "DRAFT") {
      return NextResponse.json(
        {
          error: "Session has already been finalized",
          session: {
            id: session.id,
            status: session.status,
            submittedAt: session.submittedAt,
          },
        },
        { status: 409 },
      );
    }

    const evidenceType = schedule.program.requirementType;
    const evidences = payload.evidences.filter((item) => item.type === evidenceType);

    if (payload.replaceEvidence) {
      await prisma.photo.deleteMany({ where: { sessionId: session.id } });
      await prisma.document.deleteMany({ where: { sessionId: session.id } });
    }

    if (evidenceType === "PHOTO") {
      const photos = evidences.filter((item) => item.type === "PHOTO");
      if (photos.length > 0) {
        await prisma.photo.createMany({
          data: photos.map((photo, index) => ({
            sessionId: session!.id,
            url: photo.url,
            caption: photo.caption ?? null,
            storagePath: `external/photo-${Date.now()}-${index}`,
          })),
        });
      }
    }

    if (evidenceType === "DOCUMENT") {
      const documents = evidences.filter((item) => item.type === "DOCUMENT");
      if (documents.length > 0) {
        await prisma.document.createMany({
          data: documents.map((document, index) => ({
            sessionId: session!.id,
            url: document.url,
            filename: document.filename,
            storagePath: `external/document-${Date.now()}-${index}`,
          })),
        });
      }
    }

    const refreshed = await prisma.session.findUnique({
      where: { id: session.id },
      include: {
        photos: { select: { id: true } },
        documents: { select: { id: true } },
      },
    });

    const proofCount =
      evidenceType === "PHOTO"
        ? (refreshed?.photos.length ?? 0)
        : (refreshed?.documents.length ?? 0);

    if (payload.status !== "NOT_EXECUTED" && proofCount < schedule.program.minUploads) {
      return NextResponse.json(
        {
          error: `Minimal ${schedule.program.minUploads} ${
            evidenceType === "PHOTO" ? "photo" : "document"
          } required`,
          requirementType: evidenceType,
          minUploads: schedule.program.minUploads,
          currentUploads: proofCount,
        },
        { status: 400 },
      );
    }

    const finalSession = await prisma.session.update({
      where: { id: session.id },
      data: {
        status: payload.status,
        issueNote: payload.status === "NOT_EXECUTED" ? payload.issueNote ?? null : payload.issueNote,
        submittedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, username: true } },
      },
    });

    return NextResponse.json({
      success: true,
      integrationClient: auth.clientName,
      divisionId,
      scheduleId: payload.scheduleId,
      requirementType: evidenceType,
      minUploads: schedule.program.minUploads,
      currentUploads: proofCount,
      session: {
        id: finalSession.id,
        status: finalSession.status,
        issueNote: finalSession.issueNote,
        submittedAt: finalSession.submittedAt,
        user: finalSession.user,
      },
    });
  } catch (error) {
    console.error("Integration report API error:", error);
    return NextResponse.json(
      { error: "Failed to process report" },
      { status: 500 },
    );
  }
}
