import { z } from "zod";
import { ScheduleType } from "@prisma/client";

// Base schema without refinement - used for form types
export const programBaseSchema = z.object({
  name: z.string().min(2, "Nama program minimal 2 karakter"),
  description: z.string().optional(),
  scheduleType: z.nativeEnum(ScheduleType),
  scheduleDays: z.array(z.number().min(0).max(6)).default([]),
  scheduleMonthDays: z.array(z.number().min(1).max(31)).default([]),
  customDates: z.array(z.string()).default([]),
  scheduleTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format waktu tidak valid"),
  minPhotos: z.number().min(1).max(10).default(1),
  isActive: z.boolean().default(true),
  divisionId: z.string().min(1, "Pilih divisi"),
});

// Schema with refinement - used for validation
export const programSchema = programBaseSchema.refine(
  (data) => {
    // Validate based on schedule type
    switch (data.scheduleType) {
      case ScheduleType.DAILY:
      case ScheduleType.WEEKLY:
        return data.scheduleDays.length > 0;
      case ScheduleType.MONTHLY:
        return data.scheduleMonthDays.length > 0;
      case ScheduleType.CUSTOM:
        return data.customDates.length > 0;
      default:
        return true;
    }
  },
  {
    message: "Pilih jadwal sesuai tipe yang dipilih",
    path: ["scheduleDays"],
  }
);

export const programUpdateSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Nama program minimal 2 karakter").optional(),
  description: z.string().optional(),
  scheduleType: z.nativeEnum(ScheduleType).optional(),
  scheduleDays: z.array(z.number().min(0).max(6)).optional(),
  scheduleMonthDays: z.array(z.number().min(1).max(31)).optional(),
  customDates: z.array(z.string()).optional(),
  scheduleTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format waktu tidak valid")
    .optional(),
  minPhotos: z.number().min(1).max(10).optional(),
  isActive: z.boolean().optional(),
  divisionId: z.string().optional(),
});

// Use base schema for form type to avoid inference issues with refine
export type ProgramInput = z.infer<typeof programBaseSchema>;
export type ProgramUpdateInput = z.infer<typeof programUpdateSchema>;
