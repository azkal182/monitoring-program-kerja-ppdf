import { z } from "zod";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const deadlineSchema = z.object({
  title: z.string().min(2, "Judul minimal 2 karakter"),
  description: z.string().optional(),
  dueDate: z.string().regex(DATE_REGEX, "Format tanggal tidak valid"),
  divisionId: z.string().optional().nullable(),
});

export type DeadlineInput = z.infer<typeof deadlineSchema>;
