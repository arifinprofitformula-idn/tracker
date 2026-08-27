import type { PaymentProvider } from "@/lib/payment/provider";
import { mockProvider } from "@/lib/payment/mockProvider";

export function getPaymentProvider(): PaymentProvider {
  // Self-hosted default (docs/DECISIONS.md #1). Real provider adapters (Midtrans/Xendit)
  // slot in here later without changing callers — they all go through this factory.
  return mockProvider;
}

export type { PaymentProvider, CheckoutInput, CheckoutResult, ParsedWebhookEvent } from "@/lib/payment/provider";
