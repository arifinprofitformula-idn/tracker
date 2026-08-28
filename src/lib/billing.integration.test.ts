import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { seedPlans } from "./plans";
import { ensurePersonalWorkspace } from "./workspace";
import { getEntitlements } from "./entitlements";
import { createCheckoutTransaction, processWebhookEvent } from "./billing";
import { mockProvider, signMockWebhookPayload } from "./payment/mockProvider";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ownerEmail = `billing-owner-${suffix}@test.local`;

let workspaceId = "";

function webhookRequest(body: { eventId: string; type: string; reference: string }) {
  const rawBody = JSON.stringify(body);
  const headers = new Headers({ "x-mock-signature": signMockWebhookPayload(rawBody) });
  return { rawBody, headers };
}

describe("billing checkout + webhook", () => {
  beforeAll(async () => {
    await seedPlans();
    const owner = await prisma.user.create({
      data: { email: ownerEmail, name: "Billing Owner", passwordHash: "test-hash" },
    });
    const workspace = await ensurePersonalWorkspace(owner);
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: ownerEmail } });
  });

  it("rejects checkout for a non-checkoutable plan", async () => {
    await expect(createCheckoutTransaction({ workspaceId, planCode: "FREE", interval: "monthly", customerEmail: ownerEmail }, mockProvider))
      .rejects.toThrow("PLAN_NOT_CHECKOUTABLE");
  });

  it("creates a pending transaction with a checkout URL", async () => {
    const transaction = await createCheckoutTransaction({ workspaceId, planCode: "PERSONAL_PRO", interval: "monthly", customerEmail: ownerEmail, paymentMethodCode: "MOCK" }, mockProvider);
    expect(transaction.status).toBe("PENDING");
    expect(transaction.checkoutUrl).toContain(transaction.id);
    expect(transaction.providerReference).toBe(`mock_${transaction.id}`);
    expect(transaction.metadata).toMatchObject({ interval: "monthly", paymentMethodCode: "MOCK" });
  });

  it("rejects unavailable payment method before creating a transaction", async () => {
    const before = await prisma.billingTransaction.count({ where: { workspaceId } });
    await expect(createCheckoutTransaction({ workspaceId, planCode: "PERSONAL_PRO", interval: "monthly", customerEmail: ownerEmail, paymentMethodCode: "QRIS" }, mockProvider)).rejects.toThrow("PAYMENT_METHOD_NOT_AVAILABLE");
    expect(await prisma.billingTransaction.count({ where: { workspaceId } })).toBe(before);
  });

  it("activates a subscription and upgrades entitlements on payment.paid, and is idempotent on retry", async () => {
    const transaction = await createCheckoutTransaction({ workspaceId, planCode: "PERSONAL_PRO", interval: "monthly", customerEmail: ownerEmail }, mockProvider);
    const eventId = `evt_paid_${transaction.id}`;
    const { rawBody, headers } = webhookRequest({ eventId, type: "payment.paid", reference: transaction.providerReference! });

    const first = await processWebhookEvent(rawBody, headers, mockProvider);
    expect(first).toMatchObject({ processed: true, eventType: "payment.paid" });

    await expect(getEntitlements(workspaceId)).resolves.toMatchObject({ plan: "PERSONAL_PRO", exportEnabled: true });

    const second = await processWebhookEvent(rawBody, headers, mockProvider);
    expect(second).toMatchObject({ processed: false, duplicate: true });

    const events = await prisma.webhookEvent.findMany({ where: { provider: "mock", providerEventId: eventId } });
    expect(events).toHaveLength(1);

    const subscriptions = await prisma.subscription.findMany({ where: { workspaceId, providerSubscriptionId: transaction.providerReference! } });
    expect(subscriptions).toHaveLength(1);
  });

  it("marks cancelAtPeriodEnd on subscription.canceled but keeps entitlements until period end", async () => {
    const transaction = await createCheckoutTransaction({ workspaceId, planCode: "PERSONAL_PRO", interval: "monthly", customerEmail: ownerEmail }, mockProvider);
    const paid = webhookRequest({ eventId: `evt_paid2_${transaction.id}`, type: "payment.paid", reference: transaction.providerReference! });
    await processWebhookEvent(paid.rawBody, paid.headers, mockProvider);

    const canceled = webhookRequest({ eventId: `evt_cancel_${transaction.id}`, type: "subscription.canceled", reference: transaction.providerReference! });
    const result = await processWebhookEvent(canceled.rawBody, canceled.headers, mockProvider);
    expect(result).toMatchObject({ processed: true, eventType: "subscription.canceled" });

    const subscription = await prisma.subscription.findFirst({ where: { workspaceId, providerSubscriptionId: transaction.providerReference! } });
    expect(subscription?.cancelAtPeriodEnd).toBe(true);

    await expect(getEntitlements(workspaceId)).resolves.toMatchObject({ plan: "PERSONAL_PRO" });
  });

  it("throws on an invalid webhook signature", async () => {
    const rawBody = JSON.stringify({ eventId: "evt_bad", type: "payment.paid", reference: "mock_nonexistent" });
    const headers = new Headers({ "x-mock-signature": "deadbeef" });
    await expect(processWebhookEvent(rawBody, headers, mockProvider)).rejects.toThrow("INVALID_SIGNATURE");
  });
});
