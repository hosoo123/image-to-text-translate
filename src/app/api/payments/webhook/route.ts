import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

function validSignature(rawBody: string, header: string, secret: string) {
  const timestamp = header.match(/(?:^|,)\s*t=(\d+)/)?.[1];
  const signature = header.match(/(?:^|,)\s*v1=([a-f\d]+)/i)?.[1];
  if (!timestamp || !signature || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  let received: Buffer;
  try { received = Buffer.from(signature, "hex"); } catch { return false; }
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function POST(request: Request) {
  const secret = process.env.WIRE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhook тохиргоо дутуу." }, { status: 503 });
  const rawBody = await request.text();
  const signature = request.headers.get("WirePayment-Signature") ?? "";
  if (!validSignature(rawBody, signature, secret)) return Response.json({ error: "Signature буруу." }, { status: 400 });
  try {
    const event = JSON.parse(rawBody) as { id?: string; type?: string; data?: Record<string, unknown> };
    if (!event.id || event.type !== "payment_intent.succeeded") return Response.json({ received: true });
    const payload = (event.data?.object && typeof event.data.object === "object" ? event.data.object : event.data) as Record<string, unknown> | undefined;
    const intentId = typeof payload?.id === "string" ? payload.id : typeof payload?.payment_intent === "string" ? payload.payment_intent : "";
    const amount = typeof payload?.amount === "number" ? payload.amount : typeof payload?.amount_minor === "number" ? payload.amount_minor : NaN;
    if (!intentId || !Number.isSafeInteger(amount)) return Response.json({ error: "Payment event формат буруу." }, { status: 400 });
    const { error } = await createAdminClient().rpc("fulfill_wire_payment", { p_event_id: event.id, p_payment_intent_id: intentId, p_amount_minor: amount });
    if (error) throw error;
    return Response.json({ received: true });
  } catch (error) {
    console.error("Wire webhook processing error", error);
    return Response.json({ error: "Төлбөрийн event боловсруулахад алдаа гарлаа." }, { status: 500 });
  }
}
