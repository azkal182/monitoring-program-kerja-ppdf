import type { ScheduleType } from "@/generated/prisma/enums";

// ─── Program Types ────────────────────────────────────────────────────────────

export type RequirementType = "PHOTO" | "DOCUMENT";

export interface Program {
  id: string;
  name: string;
  description: string | null;
  scheduleType: ScheduleType;
  scheduleDays: number[];
  scheduleMonthDays: number[];
  customDates: string[];
  scheduleTime: string | null;
  requirementType: RequirementType;
  minUploads: number;
  isActive: boolean;
  divisionId: string;
  division: { id: string; name: string };
  _count?: { schedules: number };
  createdAt: string;
  updatedAt: string;
}

export interface ProgramInput {
  name: string;
  description?: string;
  scheduleType: ScheduleType;
  scheduleDays: number[];
  scheduleMonthDays: number[];
  customDates: string[];
  scheduleTime: string;
  requirementType: RequirementType;
  minUploads: number;
  isActive: boolean;
  divisionId: string;
}

export interface FetchProgramsParams {
  divisionId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  scheduleTypes?: ScheduleType[];
}
