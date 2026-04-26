import { z } from "zod";

const photoEvidenceSchema = z.object({
  type: z.literal("PHOTO"),
  url: z.string().url(),
  caption: z.string().max(200).optional(),
});

const documentEvidenceSchema = z.object({
  type: z.literal("DOCUMENT"),
  url: z.string().url(),
  filename: z.string().min(1).max(190),
});

export const integrationReportSchema = z
  .object({
    scheduleId: z.string().min(1),
    status: z.enum(["COMPLETED", "COMPLETED_WITH_ISSUE", "NOT_EXECUTED"]),
    issueNote: z.string().max(2000).optional(),
    replaceEvidence: z.boolean().optional().default(true),
    evidences: z.array(z.union([photoEvidenceSchema, documentEvidenceSchema])).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.status === "COMPLETED_WITH_ISSUE" && !data.issueNote?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["issueNote"],
        message: "issueNote is required when status is COMPLETED_WITH_ISSUE",
      });
    }
  });

export type IntegrationReportInput = z.infer<typeof integrationReportSchema>;
