import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateTrackerStats } from "@/lib/tracker";

type Db = typeof prisma | Prisma.TransactionClient;

type SnapshotModule = {
  id: string;
  ownerId: string;
  workspaceId: string;
  days: number;
  activities: string[];
  startDate: Date | null;
  checks: Array<{ day: number; activityIdx: number }>;
};

export function dateOnlyUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function dayForSnapshot(startDate: Date | null, snapshotDate: Date, days: number): number | null {
  if (!startDate) return null;
  const start = dateOnlyUtc(startDate).getTime();
  const current = dateOnlyUtc(snapshotDate).getTime();
  const day = Math.floor((current - start) / 86400000) + 1;
  return day >= 1 && day <= days ? day : null;
}

export function buildProgressSnapshotInput(trackerModule: SnapshotModule, snapshotDate = new Date()) {
  const date = dateOnlyUtc(snapshotDate);
  const stats = calculateTrackerStats(
    trackerModule.days,
    trackerModule.activities,
    trackerModule.checks.map((check) => ({ day: check.day, activityIndex: check.activityIdx })),
  );

  return {
    workspaceId: trackerModule.workspaceId,
    moduleId: trackerModule.id,
    userId: trackerModule.ownerId,
    date,
    day: dayForSnapshot(trackerModule.startDate, date, trackerModule.days),
    totalActivities: trackerModule.activities.filter((activity) => activity.trim()).length,
    checkedCount: stats.checked,
    totalCount: stats.total,
    progress: stats.progress,
    perfectDays: stats.perfectDays,
    currentStreak: stats.currentStreak,
  };
}

export async function upsertProgressSnapshotForModule(moduleId: string, snapshotDate = new Date(), db: Db = prisma) {
  const trackerModule = await db.module.findUnique({
    where: { id: moduleId },
    include: { checks: true },
  });
  if (!trackerModule) throw new Error("MODULE_NOT_FOUND");

  const data = buildProgressSnapshotInput(trackerModule, snapshotDate);
  return db.progressSnapshot.upsert({
    where: { moduleId_userId_date: { moduleId: data.moduleId, userId: data.userId, date: data.date } },
    update: data,
    create: data,
  });
}

export async function upsertProgressSnapshotsForWorkspace(workspaceId: string, snapshotDate = new Date(), db: Db = prisma) {
  const modules = await db.module.findMany({
    where: { workspaceId },
    select: { id: true },
  });

  const snapshots = [];
  for (const trackerModule of modules) {
    snapshots.push(await upsertProgressSnapshotForModule(trackerModule.id, snapshotDate, db));
  }
  return snapshots;
}
