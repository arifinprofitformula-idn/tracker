import type { NextRequest } from "next/server";
import { processWebhookEvent } from "@/lib/billing";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  try {
    const result = await processWebhookEvent(rawBody, req.headers);
    return Response.json({ received: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_SIGNATURE") return Response.json({ error: "Invalid signature" }, { status: 401 });
    throw error;
  }
}
