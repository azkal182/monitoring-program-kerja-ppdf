import { z } from "zod";
import { ScheduleType } from "@prisma/client";

export const programSchema = z.object({
  name: z.string().min(2, "Nama program minimal 2 karakter"),
  description: z.string().optional(),
  scheduleType: z.nativeEnum(ScheduleType),
  scheduleDays: z
    .array(z.number().min(0).max(6))
    .min(1, "Pilih minimal 1 hari"),
  scheduleTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format waktu tidak valid"),
  minPhotos: z.number().min(1).max(10).default(1),
  isActive: z.boolean().default(true),
  divisionId: z.string().min(1, "Pilih divisi"),
});

export const programUpdateSchema = programSchema.partial().extend({
  id: z.string(),
});

export type ProgramInput = z.infer<typeof programSchema>;
export type ProgramUpdateInput = z.infer<typeof programUpdateSchema>;
