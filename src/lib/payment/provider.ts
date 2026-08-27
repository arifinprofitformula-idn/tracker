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

// "unsupported" covers provider test/ping events (e.g. Sumopod's payment.test) — recorded for
// idempotency but intentionally left as a no-op by processWebhookEvent.
export type WebhookEventType = "payment.paid" | "payment.failed" | "payment.expired" | "subscription.canceled" | "unsupported";

export type ParsedWebhookEvent = {
  providerEventId: string;
  eventType: WebhookEventType;
  providerReference: string;
};

export interface PaymentProvider {
  name: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean;
  // headers is required because some providers (e.g. Sumopod/svix) carry the idempotency key
  // (providerEventId) in a header, not in the JSON body.
  parseWebhookEvent(rawBody: string, headers: Headers): ParsedWebhookEvent;
}
