import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("payment method UI contract", () => {
  it("loads scoped methods and sends selected code to existing checkout", () => {
    const ui = read("src/components/Billing.tsx");
    expect(ui).toContain("/api/billing/payment-methods");
    expect(ui).toContain("paymentMethodCode");
    expect(ui).toContain("Pilih metode pembayaran");
    expect(ui).toContain("Lanjut ke pembayaran");
  });

  it("blocks mock checkout in production and validates provider allowlist", () => {
    const payment = read("src/lib/payment/index.ts");
    const billing = read("src/lib/billing.ts");
    expect(payment).toContain('process.env.SUMOPOD_API_KEY && process.env.SUMOPOD_WEBHOOK_SECRET');
    expect(billing).toContain("PAYMENT_METHOD_NOT_AVAILABLE");
  });

  it("keeps one checkout and one webhook backend", () => {
    const api = read("src/app/api/[...route]/route.ts");
    const webhook = read("src/app/api/billing/webhook/route.ts");
    expect(api.match(/path === "\/api\/billing\/checkout"/g)).toHaveLength(1);
    expect(webhook).toContain("processWebhookEvent");
  });
});
