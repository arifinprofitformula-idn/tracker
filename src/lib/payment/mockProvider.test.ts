import { describe, expect, it } from "vitest";
import { createMockProvider, signMockWebhookPayload } from "./mockProvider";

const provider = createMockProvider("test-secret");

describe("mockProvider.createCheckout", () => {
  it("returns a checkout URL and provider reference tied to the transaction", async () => {
    const result = await provider.createCheckout({
      transactionId: "txn_123",
      workspaceId: "ws_1",
      planCode: "PERSONAL_PRO",
      interval: "monthly",
      amountCents: 3900000,
      currency: "IDR",
      customerEmail: "user@test.local",
    });
    expect(result.checkoutUrl).toContain("txn_123");
    expect(result.providerReference).toBe("mock_txn_123");
  });
});

describe("mockProvider.verifyWebhookSignature", () => {
  const rawBody = JSON.stringify({ eventId: "evt_1", type: "payment.paid", reference: "mock_txn_123" });

  it("accepts a correctly signed payload", () => {
    const headers = new Headers({ "x-mock-signature": signMockWebhookPayload(rawBody, "test-secret") });
    expect(provider.verifyWebhookSignature(rawBody, headers)).toBe(true);
  });

  it("rejects a payload with the wrong signature", () => {
    const headers = new Headers({ "x-mock-signature": signMockWebhookPayload(rawBody, "wrong-secret") });
    expect(provider.verifyWebhookSignature(rawBody, headers)).toBe(false);
  });

  it("rejects a payload with no signature header", () => {
    expect(provider.verifyWebhookSignature(rawBody, new Headers())).toBe(false);
  });
});

describe("mockProvider.parseWebhookEvent", () => {
  it("maps a valid payload to a ParsedWebhookEvent", () => {
    const rawBody = JSON.stringify({ eventId: "evt_1", type: "payment.paid", reference: "mock_txn_123" });
    expect(provider.parseWebhookEvent(rawBody, new Headers())).toEqual({
      providerEventId: "evt_1",
      eventType: "payment.paid",
      providerReference: "mock_txn_123",
    });
  });

  it("throws on a malformed payload", () => {
    const rawBody = JSON.stringify({ eventId: "evt_1", type: "not-a-real-type", reference: "mock_txn_123" });
    expect(() => provider.parseWebhookEvent(rawBody, new Headers())).toThrow();
  });
});
