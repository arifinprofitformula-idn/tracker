import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { upsertProgressSnapshotForModule } from "./progressSnapshot";
import { ensurePersonalWorkspace } from "./workspace";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ownerEmail = `snapshot-owner-${suffix}@test.local`;

let ownerId = "";
let moduleId = "";
let workspaceId = "";

describe("progress snapshot integration", () => {
  beforeAll(async () => {
    const owner = await prisma.user.create({
      data: { email: ownerEmail, name: "Snapshot Owner", passwordHash: "test-hash" },
    });
    ownerId = owner.id;
    const workspace = await ensurePersonalWorkspace(owner);
    workspaceId = workspace.id;
    const trackerModule = await prisma.module.create({
      data: {
        ownerId,
        workspaceId,
        title: "Snapshot Module",
        days: 3,
        activities: ["Read", "Run"],
        startDate: new Date("2026-08-25T00:00:00Z"),
        checks: {
          create: [
            { day: 1, activityIdx: 0 },
            { day: 1, activityIdx: 1 },
            { day: 2, activityIdx: 0 },
          ],
        },
      },
    });
    moduleId = trackerModule.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: ownerEmail } });
  });

  it("upserts one snapshot per module, user, and date", async () => {
    const date = new Date("2026-08-27T00:00:00Z");
    const first = await upsertProgressSnapshotForModule(moduleId, date);
    const second = await upsertProgressSnapshotForModule(moduleId, date);

    expect(second.id).toBe(first.id);
    expect(second).toMatchObject({
      workspaceId,
      moduleId,
      userId: ownerId,
      day: 3,
      progress: 50,
      perfectDays: 1,
      currentStreak: 0,
    });

    const count = await prisma.progressSnapshot.count({ where: { moduleId, userId: ownerId, date } });
    expect(count).toBe(1);
  });
});
