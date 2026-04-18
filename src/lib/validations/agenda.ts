import { z } from "zod";

export const agendaSchema = z.object({
  name: z.string().min(1, "Nama agenda wajib diisi"),
  personResponsible: z.string().min(1, "Penanggung jawab wajib diisi"),
  date: z.string().min(1, "Tanggal wajib diisi"),
  quarterId: z.string().min(1, "Kuartal wajib dipilih"),
});

export type AgendaInput = z.infer<typeof agendaSchema>;
