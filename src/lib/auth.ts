import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import authConfig from "./auth.config";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    role: "ADMIN" | "KOORDINATOR" | "ANGGOTA";
    divisionId: string | null;
    divisionName: string | null;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      name: string;
      role: "ADMIN" | "KOORDINATOR" | "ANGGOTA";
      divisionId: string | null;
      divisionName: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: "ADMIN" | "KOORDINATOR" | "ANGGOTA";
    divisionId: string | null;
    divisionName: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { username, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { username },
          include: { division: true },
        });

        if (!user) {
          return null;
        }

        const isValid = await compare(password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          divisionId: user.divisionId,
          divisionName: user.division?.name || null,
        };
      },
    }),
  ],
});
