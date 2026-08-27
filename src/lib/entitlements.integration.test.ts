import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SubscriptionStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { getEntitlements } from "./entitlements";
import { seedPlans } from "./plans";
import { ensurePersonalWorkspace } from "./workspace";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ownerEmail = `entitlement-owner-${suffix}@test.local`;

let workspaceId = "";

describe("workspace entitlements integration", () => {
  beforeAll(async () => {
    await seedPlans();
    const owner = await prisma.user.create({
      data: { email: ownerEmail, name: "Entitlement Owner", passwordHash: "test-hash" },
    });
    const workspace = await ensurePersonalWorkspace(owner);
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: ownerEmail } });
  });

  it("falls back to FREE when a workspace has no subscription", async () => {
    await expect(getEntitlements(workspaceId)).resolves.toMatchObject({
      plan: "FREE",
      maxActivePrograms: 1,
      exportEnabled: false,
    });
  });

  it("uses an active subscription plan while the period is valid", async () => {
    const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "PERSONAL_PRO" } });
    await prisma.subscription.create({
      data: {
        workspaceId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date("2026-08-01T00:00:00Z"),
        currentPeriodEnd: new Date(Date.now() + 86400000),
      },
    });

    await expect(getEntitlements(workspaceId)).resolves.toMatchObject({
      plan: "PERSONAL_PRO",
      maxActivePrograms: -1,
      exportEnabled: true,
      advancedAnalytics: true,
    });
  });

  it("ignores canceled subscriptions even if they are newest", async () => {
    const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "COACH_PRO" } });
    await prisma.subscription.create({
      data: {
        workspaceId,
        planId: plan.id,
        status: SubscriptionStatus.CANCELED,
        currentPeriodStart: new Date("2026-08-01T00:00:00Z"),
        currentPeriodEnd: new Date(Date.now() + 86400000),
      },
    });

    await expect(getEntitlements(workspaceId)).resolves.toMatchObject({
      plan: "PERSONAL_PRO",
    });
  });
});
