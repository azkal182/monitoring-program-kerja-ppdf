import { z } from "zod";

export const quarterSchema = z.object({
  name: z.string().min(1, "Periode harus diisi"),
});

export type QuarterInput = z.infer<typeof quarterSchema>;
