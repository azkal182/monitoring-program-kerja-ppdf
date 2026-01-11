import { z } from "zod";
import { Role } from "@/generated/prisma/enums";

export const loginSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  username: z
    .string()
    .min(3, "Username minimal 3 karakter")
    .regex(
      /^[a-z0-9_]+$/,
      "Username hanya boleh huruf kecil, angka, dan underscore"
    ),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.nativeEnum(Role).optional().default(Role.ANGGOTA),
  divisionId: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
