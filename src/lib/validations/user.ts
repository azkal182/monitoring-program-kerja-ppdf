import { z } from "zod";
import { Role } from "@prisma/client";

export const userSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  username: z
    .string()
    .min(3, "Username minimal 3 karakter")
    .regex(
      /^[a-z0-9_]+$/,
      "Username hanya boleh huruf kecil, angka, dan underscore"
    ),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
  role: z.nativeEnum(Role),
  divisionId: z.string().nullable().optional(),
  telegramId: z.string().nullable().optional(),
});

export const userUpdateSchema = userSchema.partial().extend({
  id: z.string(),
});

export type UserInput = z.infer<typeof userSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
