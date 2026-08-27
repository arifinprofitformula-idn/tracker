import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSumopodProvider } from "./sumopodProvider";

const SECRET = "whsec_" + Buffer.from("test-signing-secret").toString("base64");

function sign(rawBody: string, svixId: string, svixTimestamp: string): string {
  const secretBytes = Buffer.from(SECRET.replace(/^whsec_/, ""), "base64");
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  return `v1,${createHmac("sha256", secretBytes).update(signedContent).digest("base64")}`;
}

describe("sumopodProvider", () => {
  beforeEach(() => {
    vi.stubEnv("SUMOPOD_API_KEY", "test-api-key");
    vi.stubEnv("SUMOPOD_WEBHOOK_SECRET", SECRET);
    vi.stubEnv("SUMOPOD_API_BASE_URL", "https://api-pay-sandbox.sumopod.test");
    vi.stubEnv("APP_URL", "https://app.test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe("createCheckout", () => {
    it("posts amount converted from cents to Rupiah and returns the checkout URL/reference", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ payment_id: "pay_123", payment_link_url: "https://pay.sumopod.com/pay/pay_123" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const provider = createSumopodProvider();
      const result = await provider.createCheckout({
        transactionId: "txn_1",
        workspaceId: "ws_1",
        planCode: "PERSONAL_PRO",
        interval: "monthly",
        amountCents: 3900000,
        currency: "IDR",
        customerEmail: "user@test.local",
      });

      expect(result).toEqual({ checkoutUrl: "https://pay.sumopod.com/pay/pay_123", providerReference: "pay_123" });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api-pay-sandbox.sumopod.test/api/v1/payments");
      const body = JSON.parse(init.body);
      expect(body.order_id).toBe("txn_1");
      expect(body.amount).toBe(39000);
      expect(init.headers["X-Api-Key"]).toBe("test-api-key");
    });

    it("throws when the API responds with a non-2xx status", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => "bad request" }));
      const provider = createSumopodProvider();
      await expect(provider.createCheckout({
        transactionId: "txn_1", workspaceId: "ws_1", planCode: "PERSONAL_PRO", interval: "monthly",
        amountCents: 3900000, currency: "IDR", customerEmail: "user@test.local",
      })).rejects.toThrow("SUMOPOD_CHECKOUT_FAILED");
    });
  });

  describe("verifyWebhookSignature", () => {
    const rawBody = JSON.stringify({ event_type: "payment.completed", data: { payment_id: "pay_1", order_id: "txn_1" } });

    it("accepts a correctly signed payload", () => {
      const svixId = "msg_1"; const svixTimestamp = "1700000000";
      const headers = new Headers({ "svix-id": svixId, "svix-timestamp": svixTimestamp, "svix-signature": sign(rawBody, svixId, svixTimestamp) });
      expect(createSumopodProvider().verifyWebhookSignature(rawBody, headers)).toBe(true);
    });

    it("rejects a tampered body", () => {
      const svixId = "msg_1"; const svixTimestamp = "1700000000";
      const headers = new Headers({ "svix-id": svixId, "svix-timestamp": svixTimestamp, "svix-signature": sign(rawBody, svixId, svixTimestamp) });
      expect(createSumopodProvider().verifyWebhookSignature(rawBody + "tampered", headers)).toBe(false);
    });

    it("rejects when required headers are missing", () => {
      expect(createSumopodProvider().verifyWebhookSignature(rawBody, new Headers())).toBe(false);
    });
  });

  describe("parseWebhookEvent", () => {
    it("maps payment.completed to payment.paid and uses svix-id as the idempotency key", () => {
      const rawBody = JSON.stringify({ event_type: "payment.completed", data: { payment_id: "pay_1", order_id: "txn_1" } });
      const headers = new Headers({ "svix-id": "msg_1" });
      expect(createSumopodProvider().parseWebhookEvent(rawBody, headers)).toEqual({
        providerEventId: "msg_1",
        eventType: "payment.paid",
        providerReference: "pay_1",
      });
    });

    it("maps an unrecognized event type (e.g. payment.test) to unsupported", () => {
      const rawBody = JSON.stringify({ event_type: "payment.test", data: { payment_id: "pay_1", order_id: "txn_1" } });
      const headers = new Headers({ "svix-id": "msg_1" });
      expect(createSumopodProvider().parseWebhookEvent(rawBody, headers).eventType).toBe("unsupported");
    });

    it("throws when svix-id is missing", () => {
      const rawBody = JSON.stringify({ event_type: "payment.completed", data: { payment_id: "pay_1", order_id: "txn_1" } });
      expect(() => createSumopodProvider().parseWebhookEvent(rawBody, new Headers())).toThrow("MISSING_SVIX_ID");
    });
  });
});
