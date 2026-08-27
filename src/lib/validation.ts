import { z } from "zod";
const normalizedEmail = z.preprocess(v => typeof v === "string" ? v.trim().toLowerCase() : v, z.string().email().max(254));
const activityNameSchema = z.string().trim().min(1).max(60);
const trackerTitleSchema = z.string().trim().min(1).max(50);
const phaseInputSchema = z.object({
  label: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(180),
  targetPercent: z.number().int().min(1).max(100),
});
export const registerSchema = z.object({ name: z.string().trim().min(2).max(80), email: normalizedEmail, password: z.string().min(10).max(128) });
export const loginSchema = z.object({ email: normalizedEmail, password: z.string().min(1).max(128) });
const moduleBaseSchema = z.object({ title: trackerTitleSchema, subtitle: z.string().trim().max(140).optional(), days: z.number().int().min(40).max(100), activities: z.array(activityNameSchema).max(10) });
export const moduleCreateSchema = moduleBaseSchema.extend({ phases: z.array(phaseInputSchema).min(1).max(4).optional() });
export const moduleUpdateSchema = moduleBaseSchema.partial().extend({ moduleId: z.string().cuid() });
export const activityActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), moduleId: z.string().cuid(), name: activityNameSchema }),
  z.object({ action: z.literal("update"), moduleId: z.string().cuid(), activityIdx: z.number().int().min(0).max(9), name: activityNameSchema }),
  z.object({ action: z.literal("delete"), moduleId: z.string().cuid(), activityIdx: z.number().int().min(0).max(9) }),
]);
export const checkSchema = z.object({ moduleId: z.string().cuid(), day: z.number().int().min(1), activityIdx: z.number().int().min(0).max(9) });
export const noteSchema = z.object({ moduleId: z.string().cuid(), phaseKey: z.string().trim().min(1).max(80), content: z.string().max(2000) });
export const startSchema = z.object({ moduleId: z.string().cuid(), startDate: z.string().date().nullable() });
export const adminUserSchema = z.object({ userId: z.string().cuid(), role: z.enum(["USER", "ADMIN"]).optional(), status: z.enum(["ACTIVE", "SUSPENDED"]).optional() }).refine(v => v.role || v.status);
export const settingSchema = z.object({ key: z.string().regex(/^[a-z][a-z0-9_.-]{1,49}$/), value: z.string().max(500) });
const dailyPlanDateSchema = z.string().date();
const minuteSchema = z.number().int().min(0).max(1440);
export const dailyPlanBlockActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), date: dailyPlanDateSchema, label: activityNameSchema, startMinute: minuteSchema, endMinute: minuteSchema }),
  z.object({ action: z.literal("update"), blockId: z.string().cuid(), label: activityNameSchema, startMinute: minuteSchema, endMinute: minuteSchema }),
  z.object({ action: z.literal("delete"), blockId: z.string().cuid() }),
]);
export const dailyPlanLockSchema = z.object({ date: dailyPlanDateSchema, locked: z.boolean() });
export const dailyPlanCompleteSchema = z.object({ blockId: z.string().cuid(), completed: z.boolean() });
export const dailyPlanRescheduleSchema = z.object({
  blockId: z.string().cuid(),
  targetDate: dailyPlanDateSchema,
  startMinute: minuteSchema,
  endMinute: minuteSchema,
  reason: z.string().trim().max(200).optional().transform(v => v || undefined),
});
export const checkoutRequestSchema = z.object({
  planCode: z.enum(["PERSONAL_PRO", "COACH_PRO", "COMMUNITY", "BUSINESS"]),
  interval: z.enum(["monthly", "yearly"]),
  workspaceId: z.string().cuid().optional(),
});
export const coachWorkspaceSchema = z.object({ name: z.string().trim().min(2).max(80) });
export const coachInviteSchema = z.object({ workspaceId: z.string().cuid(), clientEmail: normalizedEmail });
export const coachInviteAcceptSchema = z.object({ token: z.string().min(40).max(200), consent: z.literal(true), consentVersion: z.string().trim().min(1).max(30) });
export const coachInterventionSchema = z.object({ workspaceId: z.string().cuid(), linkId: z.string().cuid(), type: z.enum(["PRIVATE_NOTE", "NUDGE"]), content: z.string().trim().min(1).max(2000) });
export const coachRevokeSchema = z.object({ workspaceId: z.string().cuid(), linkId: z.string().cuid() });
export const coachSelfRevokeSchema = z.object({ linkId: z.string().cuid() });
export const profileSettingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  currentPassword: z.string().max(128).optional().transform(v => v || undefined),
  newPassword: z.string().min(10).max(128).optional().or(z.literal("")).transform(v => v || undefined),
  confirmPassword: z.string().max(128).optional().transform(v => v || undefined),
}).superRefine((v, ctx) => {
  if (!v.newPassword) return;
  if (!v.currentPassword) ctx.addIssue({ code: "custom", path: ["currentPassword"], message: "Current password is required" });
  if (v.newPassword !== v.confirmPassword) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match" });
});
