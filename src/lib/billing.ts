import { BillingTransactionStatus, Prisma, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payment";
import type { PlanCode } from "@/lib/entitlements";
import { ENTITLEMENT_ACCESS_STATUSES } from "@/lib/entitlements";

export type BillingInterval = "monthly" | "yearly";

const DAY_MS = 86_400_000;

export function computeAmountCents(plan: { monthlyPriceCents: number; yearlyPriceCents: number }, interval: BillingInterval): number {
  return interval === "yearly" ? plan.yearlyPriceCents : plan.monthlyPriceCents;
}

export function computePeriodEnd(start: Date, interval: BillingInterval): Date {
  const days = interval === "yearly" ? 365 : 30;
  return new Date(start.getTime() + days * DAY_MS);
}

export async function createCheckoutTransaction(
  input: { workspaceId: string; planCode: PlanCode; interval: BillingInterval; customerEmail: string },
) {
  const plan = await prisma.plan.findUnique({ where: { code: input.planCode } });
  if (!plan || !plan.active || plan.code === "FREE") throw new Error("PLAN_NOT_CHECKOUTABLE");

  const provider = getPaymentProvider();
  const amountCents = computeAmountCents(plan, input.interval);

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.billingTransaction.create({
      data: {
        workspaceId: input.workspaceId,
        planId: plan.id,
        status: BillingTransactionStatus.PENDING,
        amountCents,
        currency: plan.currency,
        provider: provider.name,
        metadata: { interval: input.interval },
      },
    });

    const checkout = await provider.createCheckout({
      transactionId: transaction.id,
      workspaceId: input.workspaceId,
      planCode: input.planCode,
      interval: input.interval,
      amountCents,
      currency: plan.currency,
      customerEmail: input.customerEmail,
    });

    return tx.billingTransaction.update({
      where: { id: transaction.id },
      data: { checkoutUrl: checkout.checkoutUrl, providerReference: checkout.providerReference },
    });
  });
}

function readTransactionInterval(metadata: Prisma.JsonValue): BillingInterval {
  if (typeof metadata === "object" && metadata !== null && !Array.isArray(metadata) && (metadata as Record<string, unknown>).interval === "yearly") {
    return "yearly";
  }
  return "monthly";
}

async function findLatestAccessibleSubscription(workspaceId: string, tx: Prisma.TransactionClient) {
  return tx.subscription.findFirst({
    where: { workspaceId, status: { in: [...ENTITLEMENT_ACCESS_STATUSES] } },
    orderBy: { createdAt: "desc" },
  });
}

export async function processWebhookEvent(rawBody: string, headers: Headers) {
  const provider = getPaymentProvider();
  if (!provider.verifyWebhookSignature(rawBody, headers)) throw new Error("INVALID_SIGNATURE");

  const event = provider.parseWebhookEvent(rawBody);
  const payload: Prisma.InputJsonValue = JSON.parse(rawBody);

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.webhookEvent.create({
        data: {
          provider: provider.name,
          providerEventId: event.providerEventId,
          eventType: event.eventType,
          payload,
          processedAt: new Date(),
        },
      });

      const transaction = await tx.billingTransaction.findFirst({ where: { provider: provider.name, providerReference: event.providerReference } });
      if (!transaction) return { processed: false as const, reason: "TRANSACTION_NOT_FOUND" as const };

      const now = new Date();

      if (event.eventType === "payment.paid") {
        await tx.billingTransaction.update({ where: { id: transaction.id }, data: { status: BillingTransactionStatus.PAID } });

        const interval = readTransactionInterval(transaction.metadata);
        const existing = await findLatestAccessibleSubscription(transaction.workspaceId, tx);
        if (existing) {
          await tx.subscription.update({
            where: { id: existing.id },
            data: {
              planId: transaction.planId,
              status: SubscriptionStatus.ACTIVE,
              currentPeriodStart: now,
              currentPeriodEnd: computePeriodEnd(now, interval),
              cancelAtPeriodEnd: false,
              provider: provider.name,
              providerSubscriptionId: event.providerReference,
            },
          });
        } else {
          await tx.subscription.create({
            data: {
              workspaceId: transaction.workspaceId,
              planId: transaction.planId,
              status: SubscriptionStatus.ACTIVE,
              currentPeriodStart: now,
              currentPeriodEnd: computePeriodEnd(now, interval),
              provider: provider.name,
              providerSubscriptionId: event.providerReference,
            },
          });
        }
      } else if (event.eventType === "payment.failed") {
        await tx.billingTransaction.update({ where: { id: transaction.id }, data: { status: BillingTransactionStatus.FAILED } });
      } else if (event.eventType === "payment.expired") {
        await tx.billingTransaction.update({ where: { id: transaction.id }, data: { status: BillingTransactionStatus.EXPIRED } });
      } else if (event.eventType === "subscription.canceled") {
        const existing = await tx.subscription.findFirst({ where: { workspaceId: transaction.workspaceId, providerSubscriptionId: event.providerReference } });
        if (existing) await tx.subscription.update({ where: { id: existing.id }, data: { cancelAtPeriodEnd: true } });
      }

      return { processed: true as const, eventType: event.eventType };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { processed: false as const, duplicate: true as const };
    }
    throw error;
  }
}
