import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { CheckoutInput, CheckoutResult, ParsedWebhookEvent, PaymentProvider, WebhookEventType } from "@/lib/payment/provider";

// Maps Sumopod's event_type naming to our normalized vocabulary. Anything not listed
// (e.g. "payment.test", sent from their Settings page) becomes "unsupported": recorded
// for idempotency but intentionally a no-op — see provider.ts.
const SUMOPOD_EVENT_MAP: Record<string, WebhookEventType> = {
  "payment.completed": "payment.paid",
  "payment.failed": "payment.failed",
  "payment.expired": "payment.expired",
};

const sumopodCheckoutResponseSchema = z.object({
  payment_id: z.string().min(1),
  payment_link_url: z.string().min(1),
});

const sumopodWebhookPayloadSchema = z.object({
  event_type: z.string().min(1),
  data: z.object({
    payment_id: z.string().min(1),
    order_id: z.string().min(1),
  }).passthrough(),
});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function createSumopodProvider(): PaymentProvider {
  return {
    name: "sumopod",

    async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
      const apiKey = requireEnv("SUMOPOD_API_KEY");
      const baseUrl = process.env.SUMOPOD_API_BASE_URL || "https://api-pay-sandbox.sumopod.com";
      const appUrl = process.env.APP_URL || "http://localhost:3500";
      const paymentMethodTypeCode = process.env.SUMOPOD_PAYMENT_METHOD_TYPE_CODE || "QRIS";

      const res = await fetch(`${baseUrl}/api/v1/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
        body: JSON.stringify({
          order_id: input.transactionId,
          // amountCents follows Stripe-style "smallest currency unit" convention (see plans.ts);
          // Sumopod expects the actual Rupiah amount, so divide by 100.
          amount: Math.round(input.amountCents / 100),
          currency: input.currency,
          expires_in_hours: 24,
          success_return_url: `${appUrl}/billing/success`,
          cancel_return_url: `${appUrl}/billing/cancel`,
          payment_method_type_code: paymentMethodTypeCode,
        }),
      });

      if (!res.ok) throw new Error(`SUMOPOD_CHECKOUT_FAILED: ${res.status} ${await res.text()}`);

      const data = sumopodCheckoutResponseSchema.parse(await res.json());
      return { checkoutUrl: data.payment_link_url, providerReference: data.payment_id };
    },

    verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
      const secretRaw = process.env.SUMOPOD_WEBHOOK_SECRET;
      const svixId = headers.get("svix-id");
      const svixTimestamp = headers.get("svix-timestamp");
      const svixSignature = headers.get("svix-signature");
      if (!secretRaw || !svixId || !svixTimestamp || !svixSignature) return false;

      const secretBytes = Buffer.from(secretRaw.replace(/^whsec_/, ""), "base64");
      const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
      const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");
      const expectedBuf = Buffer.from(expected, "base64");

      // svix-signature is space-separated "v1,<sig>" pairs (multiple during secret rotation).
      return svixSignature.split(" ").some((part) => {
        const signature = part.split(",")[1];
        if (!signature) return false;
        const providedBuf = Buffer.from(signature, "base64");
        if (providedBuf.length !== expectedBuf.length) return false;
        return timingSafeEqual(providedBuf, expectedBuf);
      });
    },

    parseWebhookEvent(rawBody: string, headers: Headers): ParsedWebhookEvent {
      const parsed = sumopodWebhookPayloadSchema.parse(JSON.parse(rawBody));
      // svix-id is the stable per-delivery message id — the correct idempotency key.
      // The payload itself carries no top-level event id.
      const providerEventId = headers.get("svix-id");
      if (!providerEventId) throw new Error("MISSING_SVIX_ID");

      return {
        providerEventId,
        eventType: SUMOPOD_EVENT_MAP[parsed.event_type] ?? "unsupported",
        providerReference: parsed.data.payment_id,
      };
    },
  };
}
