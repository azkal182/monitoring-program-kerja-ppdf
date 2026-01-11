import { z } from "zod";
import { SessionStatus } from "@/generated/prisma/enums";

export const sessionStartSchema = z.object({
  scheduleId: z.string().min(1, "Schedule ID required"),
});

export const sessionSubmitSchema = z.object({
  status: z.enum([SessionStatus.COMPLETED, SessionStatus.COMPLETED_WITH_ISSUE]),
  issueNote: z.string().optional(),
});

export type SessionStartInput = z.infer<typeof sessionStartSchema>;
export type SessionSubmitInput = z.infer<typeof sessionSubmitSchema>;
