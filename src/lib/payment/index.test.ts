import { afterEach, describe, expect, it, vi } from "vitest";
import { getPaymentConfiguration } from "./index";

describe("payment configuration readiness", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("blocks Sumopod checkout when credentials or webhook secret are missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENT_PROVIDER", "sumopod");
    vi.stubEnv("SUMOPOD_API_KEY", "");
    vi.stubEnv("SUMOPOD_WEBHOOK_SECRET", "");
    await expect(getPaymentConfiguration()).resolves.toMatchObject({ provider: "sumopod", checkoutEnabled: false });
  });

  it("enables configured Sumopod methods when API and webhook credentials exist", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENT_PROVIDER", "sumopod");
    vi.stubEnv("SUMOPOD_API_KEY", "configured-test-value");
    vi.stubEnv("SUMOPOD_WEBHOOK_SECRET", "configured-test-value");
    vi.stubEnv("SUMOPOD_PAYMENT_METHOD_TYPE_CODES", "QRIS");
    await expect(getPaymentConfiguration()).resolves.toMatchObject({ provider: "sumopod", checkoutEnabled: true, methods: [{ code: "QRIS", enabled: true }] });
  });
});
