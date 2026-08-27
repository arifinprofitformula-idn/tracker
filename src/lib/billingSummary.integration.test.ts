import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { seedPlans } from "./plans";
import { ensurePersonalWorkspace } from "./workspace";
import { createCheckoutTransaction, processWebhookEvent } from "./billing";
import { getBillingSummary, getBillingTransactionStatus } from "./billingSummary";
import { mockProvider, signMockWebhookPayload } from "./payment/mockProvider";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ownerEmail = `billing-summary-${suffix}@test.local`;

let workspaceId = "";

function signedWebhook(body: { eventId: string; type: "payment.paid" | "payment.failed" | "payment.expired" | "subscription.canceled"; reference: string }) {
  const rawBody = JSON.stringify(body);
  return { rawBody, headers: new Headers({ "x-mock-signature": signMockWebhookPayload(rawBody) }) };
}

describe("billing summary contract", () => {
  beforeAll(async () => {
    await seedPlans();
    const owner = await prisma.user.create({
      data: { email: ownerEmail, name: "Billing Summary Owner", passwordHash: "test-hash" },
    });
    const workspace = await ensurePersonalWorkspace(owner);
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: ownerEmail } });
  });

  it("returns plans, current plan, usage, and transaction history from server-side state", async () => {
    await prisma.module.create({
      data: {
        ownerId: (await prisma.user.findUniqueOrThrow({ where: { email: ownerEmail } })).id,
        workspaceId,
        title: "Billing Usage Tracker",
        days: 40,
        activities: [],
      },
    });

    const checkout = await createCheckoutTransaction({ workspaceId, planCode: "PERSONAL_PRO", interval: "yearly", customerEmail: ownerEmail }, mockProvider);
    const paid = signedWebhook({ eventId: `evt_summary_${checkout.id}`, type: "payment.paid", reference: checkout.providerReference! });
    await processWebhookEvent(paid.rawBody, paid.headers, mockProvider);

    const summary = await getBillingSummary(workspaceId);

    expect(summary.currentPlan).toMatchObject({ code: "PERSONAL_PRO", billingCycle: "yearly" });
    expect(summary.subscription?.status).toBe("ACTIVE");
    expect(summary.entitlements).toMatchObject({ plan: "PERSONAL_PRO", exportEnabled: true });
    expect(summary.usage.activePrograms).toMatchObject({ current: 1, limit: -1 });
    expect(summary.plans.map((plan) => plan.code)).toContain("FREE");
    expect(summary.plans.find((plan) => plan.code === "PERSONAL_PRO")?.checkoutable).toBe(true);
    expect(summary.transactions[0]).toMatchObject({ id: checkout.id, status: "PAID", planCode: "PERSONAL_PRO" });
  });

  it("scopes payment status to the workspace", async () => {
    const checkout = await createCheckoutTransaction({ workspaceId, planCode: "PERSONAL_PRO", interval: "monthly", customerEmail: ownerEmail }, mockProvider);

    await expect(getBillingTransactionStatus(workspaceId, checkout.id)).resolves.toMatchObject({ id: checkout.id, status: "PENDING" });
    await expect(getBillingTransactionStatus("missing_workspace", checkout.id)).resolves.toBeNull();
  });
});
