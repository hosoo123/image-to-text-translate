import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/require-user";
import { isPlanCode, PLANS } from "@/lib/billing/plans";

function wireErrorDetails(payload: unknown) {
  if (!payload || typeof payload !== "object") return { response: "Invalid JSON response" };
  const rawError = "error" in payload ? payload.error : payload;
  if (!rawError || typeof rawError !== "object") return { response: "Unexpected response shape" };
  const error = rawError as Record<string, unknown>;
  const details: Record<string, unknown> = {};
  for (const key of ["type", "code", "message", "param", "request_id", "operator_decline_code"] as const) {
    if (key in error && typeof error[key] === "string") details[key] = error[key];
  }
  return details;
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.configured) return Response.json({ error: "Supabase тохиргоо дутуу байна." }, { status: 503 });
  if (!auth.user) return Response.json({ error: "Эхлээд нэвтэрнэ үү." }, { status: 401 });
  if (!process.env.WIRE_API_KEY) return Response.json({ error: "WireMN тохиргоо хийгдээгүй байна." }, { status: 503 });

  let body: { planCode?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Хүсэлтийн мэдээлэл буруу байна." }, { status: 400 }); }
  if (!isPlanCode(body.planCode)) return Response.json({ error: "Багц сонголт буруу байна." }, { status: 400 });

  const plan = PLANS[body.planCode];
  const apiKey = process.env.WIRE_API_KEY;
  const allowedOperators = apiKey.startsWith("sk_test_")
    ? ["sandbox"]
    : (process.env.WIRE_ALLOWED_OPERATORS ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!allowedOperators.length) return Response.json({ error: "WIRE_ALLOWED_OPERATORS тохиргоо дутуу байна." }, { status: 503 });

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin.from("payment_orders").insert({
    user_id: auth.user.id,
    plan_code: body.planCode,
    months: plan.months,
    price_mnt: plan.priceMnt,
    amount_minor: plan.priceMnt * 100,
  }).select("id").single();
  if (orderError || !order) return Response.json({ error: "Захиалга үүсгэж чадсангүй." }, { status: 503 });

  try {
    const intentResponse = await fetch("https://api.wire.mn/v1/payment_intents", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `intent-${order.id}` },
      body: JSON.stringify({ amount: plan.priceMnt * 100, currency: "MNT", description: `Manhwa AI ${plan.label} эрх`, allowed_operators: allowedOperators }),
    });
    const intentJson = await intentResponse.json();
    if (!intentResponse.ok || typeof intentJson.id !== "string") {
      console.error("Wire PaymentIntent request failed", { status: intentResponse.status, ...wireErrorDetails(intentJson) });
      throw new Error("WireMN төлбөрийн хүсэлт амжилтгүй.");
    }

    const { error: intentSaveError } = await admin.from("payment_orders").update({ payment_intent_id: intentJson.id }).eq("id", order.id);
    if (intentSaveError) throw intentSaveError;

    const baseUrl = new URL(request.url).origin;
    const checkoutResponse = await fetch("https://api.wire.mn/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `checkout-${order.id}` },
      body: new URLSearchParams({ payment_intent: intentJson.id, success_url: `${baseUrl}/account?payment=${order.id}`, cancel_url: `${baseUrl}/plans?cancelled=1` }),
    });
    const checkoutJson = await checkoutResponse.json();
    if (!checkoutResponse.ok || typeof checkoutJson.url !== "string") {
      console.error("Wire checkout session request failed", { status: checkoutResponse.status, ...wireErrorDetails(checkoutJson) });
      throw new Error("WireMN QR checkout үүссэнгүй.");
    }

    const { error: updateError } = await admin.from("payment_orders").update({ checkout_url: checkoutJson.url }).eq("id", order.id);
    if (updateError) throw updateError;
    return Response.json({ checkoutUrl: checkoutJson.url });
  } catch (error) {
    console.error("WireMN checkout error", error);
    return Response.json({ error: "Төлбөрийн хуудас үүссэнгүй. Тохиргоог шалгаад дахин оролдоно уу." }, { status: 502 });
  }
}
