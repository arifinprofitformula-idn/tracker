import type { PaymentProvider } from "@/lib/payment/provider";
import { mockProvider } from "@/lib/payment/mockProvider";
import { createSumopodProvider } from "@/lib/payment/sumopodProvider";

let sumopodProvider: PaymentProvider | undefined;

export function getPaymentProvider(): PaymentProvider {
  // Defaults to mock so tests and un-configured local envs never hit a real gateway.
  // Set PAYMENT_PROVIDER=sumopod (+ SUMOPOD_* env vars) to go live.
  if (process.env.PAYMENT_PROVIDER === "sumopod") {
    sumopodProvider ??= createSumopodProvider();
    return sumopodProvider;
  }
  return mockProvider;
}

export async function getPaymentConfiguration() {
  const provider = getPaymentProvider();
  const sumopodReady = provider.name === "sumopod" && Boolean(process.env.SUMOPOD_API_KEY && process.env.SUMOPOD_WEBHOOK_SECRET);
  const checkoutEnabled = provider.name === "mock" ? process.env.NODE_ENV !== "production" : sumopodReady;
  const methods = (await provider.listPaymentMethods()).map(method => ({ ...method, enabled: method.enabled && checkoutEnabled }));
  return { provider: provider.name, checkoutEnabled, methods };
}

export type { PaymentProvider, CheckoutInput, CheckoutResult, ParsedWebhookEvent } from "@/lib/payment/provider";
