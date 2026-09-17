import { DailyProgressAuditSource, DailyProgressStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { ensurePersonalWorkspace } from "./workspace";
import { endDateForDuration, initializeDailyProgress, isoDateInTimeZone, reconcileMissedDailyProgress, submitDailyProgress } from "./trackerLifecycle";

const email = `tracker-lifecycle-${Date.now()}@example.com`;
let userId = "";
let moduleId = "";

describe("tracker lifecycle persistence", () => {
  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email, name: "Lifecycle Owner", passwordHash: "test" } });
    userId = user.id;
    const workspace = await ensurePersonalWorkspace(user);
    const startDate = new Date(`${isoDateInTimeZone()}T00:00:00.000Z`);
    const tracker = await prisma.module.create({
      data: {
        ownerId: user.id,
        workspaceId: workspace.id,
        title: "Life change",
        days: 40,
        activities: ["Read", "Run"],
        startDate,
        endDate: endDateForDuration(startDate, 40),
      },
    });
    moduleId = tracker.id;
    await initializeDailyProgress(tracker);
  });

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } });
  });

  it("persists 40 timeline rows and audits a same-day submission", async () => {
    expect(await prisma.dailyProgress.count({ where: { moduleId } })).toBe(40);
    const updated = await prisma.$transaction(tx => submitDailyProgress({
      moduleId,
      userId,
      day: 1,
      progress: 75,
      actorUserId: userId,
      source: DailyProgressAuditSource.USER,
    }, tx));
    expect(updated).toMatchObject({ progress: 75, status: DailyProgressStatus.SUBMITTED });
    const audit = await prisma.dailyProgressAudit.findFirst({ where: { moduleId }, orderBy: { createdAt: "desc" } });
    expect(audit).toMatchObject({ previousProgress: 0, newProgress: 75, source: DailyProgressAuditSource.USER });
  });

  it("materializes elapsed pending rows as missed with a system audit", async () => {
    const yesterday = new Date(`${isoDateInTimeZone()}T00:00:00.000Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const historical = await prisma.module.create({
      data: {
        ownerId: userId,
        workspaceId: `ws_personal_${userId}`,
        title: "Historical",
        days: 40,
        activities: ["Reflect"],
        startDate: yesterday,
        endDate: endDateForDuration(yesterday, 40),
      },
    });
    await initializeDailyProgress(historical);
    expect(await reconcileMissedDailyProgress(userId)).toBe(1);
    const missed = await prisma.dailyProgress.findUnique({ where: { moduleId_userId_day: { moduleId: historical.id, userId, day: 1 } } });
    expect(missed).toMatchObject({ progress: 0, status: DailyProgressStatus.MISSED });
    const audit = await prisma.dailyProgressAudit.findFirst({ where: { moduleId: historical.id } });
    expect(audit).toMatchObject({ source: DailyProgressAuditSource.SYSTEM, newStatus: DailyProgressStatus.MISSED });
  });
});
