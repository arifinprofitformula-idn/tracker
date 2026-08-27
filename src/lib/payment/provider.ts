import type { PlanCode } from "@/lib/entitlements";

export type CheckoutInput = {
  transactionId: string;
  workspaceId: string;
  planCode: PlanCode;
  interval: "monthly" | "yearly";
  amountCents: number;
  currency: string;
  customerEmail: string;
};

export type CheckoutResult = {
  checkoutUrl: string;
  providerReference: string;
};

export type WebhookEventType = "payment.paid" | "payment.failed" | "payment.expired" | "subscription.canceled";

export type ParsedWebhookEvent = {
  providerEventId: string;
  eventType: WebhookEventType;
  providerReference: string;
};

export interface PaymentProvider {
  name: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean;
  parseWebhookEvent(rawBody: string): ParsedWebhookEvent;
}
