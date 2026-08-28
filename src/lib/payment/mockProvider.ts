import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { CheckoutInput, CheckoutResult, ParsedWebhookEvent, PaymentProvider, WebhookEventType } from "@/lib/payment/provider";

const webhookEventTypes = ["payment.paid", "payment.failed", "payment.expired", "subscription.canceled"] as const satisfies readonly WebhookEventType[];

const mockWebhookPayloadSchema = z.object({
  eventId: z.string().min(1),
  type: z.enum(webhookEventTypes),
  reference: z.string().min(1),
});

function sign(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function createMockProvider(secret = process.env.MOCK_PROVIDER_SECRET || "dev-secret"): PaymentProvider {
  return {
    name: "mock",
    async listPaymentMethods() {
      return [{ code: "MOCK", label: "Simulasi lokal", category: "test" as const, enabled: true }];
    },
    async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
      const baseUrl = process.env.APP_URL || "http://localhost:3500";
      return {
        checkoutUrl: `${baseUrl}/billing/mock-checkout/${input.transactionId}`,
        providerReference: `mock_${input.transactionId}`,
      };
    },
    verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
      const provided = headers.get("x-mock-signature");
      if (!provided) return false;
      const expected = sign(rawBody, secret);
      const providedBuf = Buffer.from(provided, "hex");
      const expectedBuf = Buffer.from(expected, "hex");
      if (providedBuf.length !== expectedBuf.length) return false;
      return timingSafeEqual(providedBuf, expectedBuf);
    },
    parseWebhookEvent(rawBody: string): ParsedWebhookEvent {
      const parsed = mockWebhookPayloadSchema.parse(JSON.parse(rawBody));
      return { providerEventId: parsed.eventId, eventType: parsed.type, providerReference: parsed.reference };
    },
  };
}

export function signMockWebhookPayload(rawBody: string, secret = process.env.MOCK_PROVIDER_SECRET || "dev-secret"): string {
  return sign(rawBody, secret);
}

export const mockProvider = createMockProvider();
