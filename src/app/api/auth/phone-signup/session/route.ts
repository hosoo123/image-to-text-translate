import { randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeMongolianPhone(value: unknown) {
  const phone = typeof value === "string" ? value.replace(/[\s()+-]/g, "") : "";
  const local = phone.startsWith("976") ? phone.slice(3) : phone;
  return /^\d{8}$/.test(local) ? local : null;
}

export async function POST(request: Request) {
  if (!process.env.VERIFY_MN_API_KEY) return Response.json({ error: "Verify.MN тохиргоо хийгдээгүй байна." }, { status: 503 });
  let body: { phone?: unknown; purpose?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Утасны дугаар оруулна уу." }, { status: 400 }); }
  const phone = normalizeMongolianPhone(body.phone);
  const purpose = body.purpose === "password_reset" ? "password_reset" : "signup";
  if (!phone) return Response.json({ error: "Монголын 8 оронтой утасны дугаар оруулна уу." }, { status: 400 });

  const admin = createAdminClient();
  const { data: linkedPhone } = await admin.from("user_phone_verifications").select("user_id").eq("phone", phone).maybeSingle();
  if (purpose === "signup" && linkedPhone) return Response.json({ error: "Энэ утас бүртгэлтэй байна. Нэвтрэх хэсгийг ашиглана уу." }, { status: 409 });
  if (purpose === "password_reset" && !linkedPhone) return Response.json({ error: "Энэ дугаартай баталгаажсан бүртгэл олдсонгүй." }, { status: 404 });
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin.from("pending_phone_signups").select("session_id", { count: "exact", head: true }).eq("phone", phone).gte("created_at", since);
  if ((count ?? 0) >= 3) return Response.json({ error: "Энэ дугаарт 24 цагт 3-аас олон SMS баталгаажуулах оролдлого хийх боломжгүй." }, { status: 429 });

  try {
    const response = await fetch("https://api.verify.mn/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.VERIFY_MN_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ phone, text: String(randomInt(100000, 1000000)) }),
    });
    const result = await response.json();
    if (!response.ok || typeof result.sessionId !== "string" || typeof result.smsUri !== "string") {
      return Response.json({ error: "Verify.MN session үүссэнгүй. Дугаараа шалгаад дахин оролдоно уу." }, { status: 502 });
    }
    const { error } = await admin.from("pending_phone_signups").insert({ session_id: result.sessionId, phone, purpose, expires_at: result.expiresAt });
    if (error) throw error;
    return Response.json({ sessionId: result.sessionId, smsUri: result.smsUri, instruction: result.displayInstruction, expiresAt: result.expiresAt });
  } catch (error) {
    console.error("Phone signup session error", error);
    return Response.json({ error: "Утасны баталгаажуулах хүсэлт хадгалагдсангүй." }, { status: 503 });
  }
}
