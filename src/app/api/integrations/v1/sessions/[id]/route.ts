import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sessionSubmitSchema } from "@/lib/validations/session";
import {
  authenticateIntegrationClient,
  isDivisionAllowed,
} from "@/lib/integration-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const integrationClient = authenticateIntegrationClient(request);
    if (!integrationClient.ok) {
      return NextResponse.json(
        { error: integrationClient.error },
        { status: integrationClient.status },
      );
    }

    const { id } = await params;

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, username: true } },
        schedule: {
          include: {
            program: { include: { division: true } },
          },
        },
        photos: true,
        documents: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    }

    if (!isDivisionAllowed(integrationClient.divisionIds, session.schedule.program.divisionId)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke sesi ini" },
        { status: 403 },
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Integration session GET API error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data sesi" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const integrationClient = authenticateIntegrationClient(request);
    if (!integrationClient.ok) {
      return NextResponse.json(
        { error: integrationClient.error },
        { status: integrationClient.status },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = sessionSubmitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const existingSession = await prisma.session.findUnique({
      where: { id },
      include: {
        schedule: { include: { program: true } },
        _count: { select: { photos: true, documents: true } },
      },
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    }

    if (
      !isDivisionAllowed(
        integrationClient.divisionIds,
        existingSession.schedule.program.divisionId,
      )
    ) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke sesi ini" },
        { status: 403 },
      );
    }

    if (existingSession.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Sesi sudah disubmit dan tidak dapat diubah" },
        { status: 400 },
      );
    }

    if (
      parsed.data.status === "COMPLETED_WITH_ISSUE" &&
      !parsed.data.issueNote
    ) {
      return NextResponse.json(
        { error: "Catatan kendala wajib diisi" },
        { status: 400 },
      );
    }

    const requirementType = existingSession.schedule.program.requirementType;
    const minUploads = existingSession.schedule.program.minUploads;
    const proofCount =
      requirementType === "PHOTO"
        ? existingSession._count.photos
        : existingSession._count.documents;

    if (proofCount < minUploads) {
      return NextResponse.json(
        {
          error: `Minimal ${minUploads} ${
            requirementType === "PHOTO" ? "foto" : "dokumen"
          } harus diunggah`,
        },
        { status: 400 },
      );
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: {
        status: parsed.data.status,
        issueNote: parsed.data.issueNote,
        submittedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true } },
        schedule: { include: { program: true } },
        photos: true,
        documents: true,
      },
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Integration session PUT API error:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate sesi" },
      { status: 500 },
    );
  }
}
