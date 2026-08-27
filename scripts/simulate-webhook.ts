import { signMockWebhookPayload } from "../src/lib/payment/mockProvider";

async function main() {
  const reference = process.argv[2];
  const type = process.argv[3] ?? "payment.paid";
  if (!reference) throw new Error("Usage: tsx scripts/simulate-webhook.ts <providerReference> [eventType]");

  const rawBody = JSON.stringify({ eventId: `evt_${Date.now()}`, type, reference });
  const signature = signMockWebhookPayload(rawBody);
  const baseUrl = process.env.APP_URL || "http://localhost:3500";

  const res = await fetch(`${baseUrl}/api/billing/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-mock-signature": signature },
    body: rawBody,
  });
  console.log(`status=${res.status}`, await res.text());
}

main();
