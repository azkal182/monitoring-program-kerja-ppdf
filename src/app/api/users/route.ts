import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { userSchema } from "@/lib/validations/user";
import { hash } from "bcryptjs";
import { parsePagination } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const divisionId = searchParams.get("divisionId");
    const role = searchParams.get("role");
    const { take, skip } = parsePagination(searchParams);

    const users = await prisma.user.findMany({
      where: {
        ...(divisionId && { divisionId }),
        ...(role && { role: role as "ADMIN" | "KOORDINATOR" | "ANGGOTA" }),
      },
      include: {
        division: { select: { id: true, name: true } },
      },
      ...(typeof take === "number" && take > 0 ? { take } : {}),
      ...(typeof skip === "number" && skip > 0 ? { skip } : {}),
      orderBy: { name: "asc" },
    });

    // Remove password from response
    const sanitizedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      telegramId: user.telegramId,
      divisionId: user.divisionId,
      division: user.division,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return NextResponse.json(sanitizedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data pengguna" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = userSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { password, ...data } = parsed.data;

    const existing = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Username sudah terdaftar" },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Password wajib diisi" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      include: {
        division: { select: { id: true, name: true } },
      },
    });

    const sanitizedUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      telegramId: user.telegramId,
      divisionId: user.divisionId,
      division: user.division,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    return NextResponse.json(sanitizedUser, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Gagal membuat pengguna" },
      { status: 500 }
    );
  }
}
