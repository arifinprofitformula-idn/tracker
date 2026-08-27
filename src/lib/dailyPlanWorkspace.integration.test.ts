import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WorkspaceRole } from "@prisma/client";
import { prisma } from "./prisma";
import { accessibleDailyPlanWhere, ensurePersonalWorkspace } from "./workspace";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ownerEmail = `daily-plan-owner-${suffix}@test.local`;
const viewerEmail = `daily-plan-viewer-${suffix}@test.local`;

let ownerId = "";
let viewerId = "";
let ownerWorkspaceId = "";
let dailyPlanId = "";

describe("daily plan workspace privacy", () => {
  beforeAll(async () => {
    const owner = await prisma.user.create({
      data: { email: ownerEmail, name: "Daily Plan Owner", passwordHash: "test-hash" },
    });
    const viewer = await prisma.user.create({
      data: { email: viewerEmail, name: "Daily Plan Viewer", passwordHash: "test-hash" },
    });
    ownerId = owner.id;
    viewerId = viewer.id;

    const ownerWorkspace = await ensurePersonalWorkspace(owner);
    await ensurePersonalWorkspace(viewer);
    ownerWorkspaceId = ownerWorkspace.id;

    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: ownerWorkspaceId, userId: viewerId } },
      update: { role: WorkspaceRole.VIEWER },
      create: {
        id: `wsm_daily_viewer_${suffix}`,
        workspaceId: ownerWorkspaceId,
        userId: viewerId,
        role: WorkspaceRole.VIEWER,
      },
    });

    const plan = await prisma.dailyPlan.create({
      data: {
        userId: ownerId,
        workspaceId: ownerWorkspaceId,
        date: new Date("2026-08-27T00:00:00Z"),
      },
    });
    dailyPlanId = plan.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, viewerEmail] } } });
  });

  it("allows the owner to read their own workspace-attached daily plan", async () => {
    const plan = await prisma.dailyPlan.findFirst({
      where: { id: dailyPlanId, ...accessibleDailyPlanWhere(ownerId) },
    });

    expect(plan?.id).toBe(dailyPlanId);
  });

  it("does not expose a personal daily plan to another workspace member", async () => {
    const plan = await prisma.dailyPlan.findFirst({
      where: { id: dailyPlanId, ...accessibleDailyPlanWhere(viewerId) },
    });

    expect(plan).toBeNull();
  });
});
