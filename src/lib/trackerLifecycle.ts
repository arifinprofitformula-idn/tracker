import { DailyProgressAuditSource, DailyProgressStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export const TRACKER_TIME_ZONE = "Asia/Jakarta";
export const MIN_TRACKER_DAYS = 40;
export const MAX_TRACKER_DAYS = 100;
const DAY_MS = 86_400_000;

export type DailyProgressLike = {
  progress: number;
  status: DailyProgressStatus | "PENDING" | "SUBMITTED" | "MISSED";
};

export function isoDateInTimeZone(date = new Date(), timeZone = TRACKER_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function dateOnlyUtc(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  return new Date(`${value}T00:00:00.000Z`);
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function inclusiveDayCount(startDate: Date, endDate: Date): number {
  return Math.floor((dateOnlyUtc(endDate).getTime() - dateOnlyUtc(startDate).getTime()) / DAY_MS) + 1;
}

export function trackerPeriod(endDateIso: string, startDateIso = isoDateInTimeZone()) {
  const startDate = dateOnlyUtc(startDateIso);
  const endDate = dateOnlyUtc(endDateIso);
  const days = inclusiveDayCount(startDate, endDate);
  if (days < MIN_TRACKER_DAYS || days > MAX_TRACKER_DAYS) throw new Error("TRACKER_DURATION_INVALID");
  return { startDate, endDate, days };
}

export function endDateForDuration(startDate: Date, days: number): Date {
  return addUtcDays(dateOnlyUtc(startDate), days - 1);
}

export function dayNumberForDate(startDate: Date, date: Date, totalDays: number): number | null {
  const day = inclusiveDayCount(startDate, date);
  return day >= 1 && day <= totalDays ? day : null;
}

export function hasTrackerEnded(endDate: Date | string | null | undefined, now = new Date()): boolean {
  if (!endDate) return false;
  const endIso = endDate instanceof Date ? endDate.toISOString().slice(0, 10) : endDate.slice(0, 10);
  return isoDateInTimeZone(now) > endIso;
}

export function calculateDailyProgressSummary(rows: DailyProgressLike[], totalDays: number) {
  const submittedDays = rows.filter((row) => row.status === "SUBMITTED").length;
  const missedDays = rows.filter((row) => row.status === "MISSED").length;
  const pendingDays = Math.max(totalDays - submittedDays - missedDays, 0);
  const progressPoints = rows.reduce((sum, row) => sum + (row.status === "SUBMITTED" ? row.progress : 0), 0);
  return {
    submittedDays,
    missedDays,
    pendingDays,
    accountabilityPercent: totalDays ? Math.round((submittedDays / totalDays) * 100) : 0,
    progressPercent: totalDays ? Math.round(progressPoints / totalDays) : 0,
  };
}

export function dailyProgressRows(moduleId: string, userId: string, startDate: Date, days: number) {
  const start = dateOnlyUtc(startDate);
  return Array.from({ length: days }, (_, index) => ({
    moduleId,
    userId,
    day: index + 1,
    date: addUtcDays(start, index),
    progress: 0,
    status: DailyProgressStatus.PENDING,
  }));
}

export async function initializeDailyProgress(
  trackerModule: { id: string; ownerId: string; startDate: Date | null; days: number },
  db: Db = prisma,
) {
  if (!trackerModule.startDate) return { count: 0 };
  return db.dailyProgress.createMany({
    data: dailyProgressRows(trackerModule.id, trackerModule.ownerId, trackerModule.startDate, trackerModule.days),
    skipDuplicates: true,
  });
}

export async function reconcileMissedDailyProgress(userId: string, now = new Date()) {
  const today = dateOnlyUtc(isoDateInTimeZone(now));
  const pending = await prisma.dailyProgress.findMany({
    where: { userId, status: DailyProgressStatus.PENDING, date: { lt: today } },
    select: { id: true, moduleId: true, userId: true, progress: true, status: true },
  });
  if (!pending.length) return 0;

  return prisma.$transaction(async (tx) => {
    let changed = 0;
    for (const row of pending) {
      const result = await tx.dailyProgress.updateMany({
        where: { id: row.id, status: DailyProgressStatus.PENDING },
        data: { progress: 0, status: DailyProgressStatus.MISSED, submittedAt: null },
      });
      if (!result.count) continue;
      changed++;
      await tx.dailyProgressAudit.create({
        data: {
          dailyProgressId: row.id,
          moduleId: row.moduleId,
          userId: row.userId,
          actorUserId: null,
          source: DailyProgressAuditSource.SYSTEM,
          previousProgress: row.progress,
          newProgress: 0,
          previousStatus: row.status,
          newStatus: DailyProgressStatus.MISSED,
        },
      });
    }
    return changed;
  });
}

export async function submitDailyProgress(
  input: {
    moduleId: string;
    userId: string;
    day: number;
    progress: number;
    actorUserId: string;
    source: DailyProgressAuditSource;
    now?: Date;
  },
  db: Db = prisma,
) {
  const row = await db.dailyProgress.findUnique({
    where: { moduleId_userId_day: { moduleId: input.moduleId, userId: input.userId, day: input.day } },
  });
  if (!row) throw new Error("DAILY_PROGRESS_NOT_FOUND");
  const today = isoDateInTimeZone(input.now);
  if (row.date.toISOString().slice(0, 10) !== today) throw new Error("DAILY_PROGRESS_DATE_LOCKED");
  if (row.status === DailyProgressStatus.MISSED) throw new Error("DAILY_PROGRESS_MISSED");

  const progress = Math.max(0, Math.min(100, Math.round(input.progress)));
  const updated = await db.dailyProgress.update({
    where: { id: row.id },
    data: { progress, status: DailyProgressStatus.SUBMITTED, submittedAt: input.now ?? new Date() },
  });
  await db.dailyProgressAudit.create({
    data: {
      dailyProgressId: row.id,
      moduleId: row.moduleId,
      userId: row.userId,
      actorUserId: input.actorUserId,
      source: input.source,
      previousProgress: row.progress,
      newProgress: progress,
      previousStatus: row.status,
      newStatus: DailyProgressStatus.SUBMITTED,
    },
  });
  return updated;
}

export function progressFromChecklist(activities: string[], checkedActivityIndexes: number[]): number {
  const filled = activities.map((activity, index) => activity.trim() ? index : -1).filter((index) => index >= 0);
  if (!filled.length) return 0;
  const checked = new Set(checkedActivityIndexes);
  return Math.round((filled.filter((index) => checked.has(index)).length / filled.length) * 100);
}

export function canEditTrackerActivities(startDate: Date | string | null | undefined, now = new Date()): boolean {
  if (!startDate) return true;
  const startIso = startDate instanceof Date ? startDate.toISOString().slice(0, 10) : startDate.slice(0, 10);
  return isoDateInTimeZone(now) <= startIso;
}
