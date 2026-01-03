import { z } from "zod";

export const divisionSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  description: z.string().optional(),
});

export type DivisionInput = z.infer<typeof divisionSchema>;
