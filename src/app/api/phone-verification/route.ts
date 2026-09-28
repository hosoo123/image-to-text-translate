import { randomInt } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/require-user";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const apiKey = process.env.VERIFY_MN_API_KEY;
  if (!apiKey) return Response.json({ error: "Verify.MN тохиргоо хийгдээгүй байна." }, { status: 503 });

  let body: { phone?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Утасны дугаар оруулна уу." }, { status: 400 }); }
  const phone = typeof body.phone === "string" ? body.phone.replace(/[\s()+-]/g, "") : "";
  const localPhone = phone.startsWith("976") ? phone.slice(3) : phone;
  if (!/^\d{8}$/.test(localPhone)) return Response.json({ error: "Монголын 8 оронтой утасны дугаар оруулна уу." }, { status: 400 });

  const supabase = await createClient();
  const { data: existing } = await supabase.from("user_phone_verifications").select("phone").eq("user_id", auth.user.id).maybeSingle();
  if (existing) return Response.json({ error: "Таны утас аль хэдийн баталгаажсан байна." }, { status: 409 });
  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin.from("phone_verification_sessions").select("session_id", { count: "exact", head: true }).eq("user_id", auth.user.id).gte("created_at", since);
  if ((count ?? 0) >= 3) return Response.json({ error: "24 цагт 3 удаа баталгаажуулах хүсэлт эхлүүлэх боломжтой." }, { status: 429 });

  try {
    const response = await fetch("https://api.verify.mn/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ phone: localPhone, text: String(randomInt(100000, 1000000)) }),
    });
    const result = await response.json();
    if (!response.ok || typeof result.sessionId !== "string" || typeof result.smsUri !== "string") {
      return Response.json({ error: "Verify.MN session үүссэнгүй. Дугаараа шалгаад дахин оролдоно уу." }, { status: 502 });
    }
    const { error } = await admin.from("phone_verification_sessions").insert({
      session_id: result.sessionId, user_id: auth.user.id, phone: localPhone, expires_at: result.expiresAt,
    });
    if (error) throw error;
    return Response.json({ sessionId: result.sessionId, smsUri: result.smsUri, instruction: result.displayInstruction, expiresAt: result.expiresAt });
  } catch (error) {
    console.error("Verify.MN session error", error);
    return Response.json({ error: "Утас баталгаажуулах session хадгалагдсангүй." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) return Response.json({ error: "Session олдсонгүй." }, { status: 400 });
  const admin = createAdminClient();
  const { data: session, error } = await admin.from("phone_verification_sessions")
    .select("phone, expires_at").eq("session_id", sessionId).eq("user_id", auth.user.id).maybeSingle();
  if (error || !session) return Response.json({ error: "Баталгаажуулалтын хүсэлт олдсонгүй." }, { status: 404 });
  const apiKey = process.env.VERIFY_MN_API_KEY;
  if (!apiKey) return Response.json({ error: "Verify.MN тохиргоо хийгдээгүй байна." }, { status: 503 });
  try {
    const response = await fetch(`https://api.verify.mn/sessions/${encodeURIComponent(sessionId)}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) return Response.json({ error: "Verify.MN төлөв шалгаж чадсангүй." }, { status: 502 });
    if (result.sessionStatus === "VERIFIED") {
      const { data: usedPhone } = await admin.from("user_phone_verifications").select("user_id").eq("phone", session.phone).maybeSingle();
      if (usedPhone && usedPhone.user_id !== auth.user.id) return Response.json({ error: "Энэ утас өөр бүртгэлд холбогдсон байна." }, { status: 409 });
      const { error: saveError } = await admin.from("user_phone_verifications").upsert({ user_id: auth.user.id, phone: session.phone, verified_at: new Date().toISOString() });
      if (saveError) return Response.json({ error: "Энэ утас өөр бүртгэлд холбогдсон байж магадгүй." }, { status: 409 });
    }
    return Response.json({ status: result.sessionStatus, expiresAt: session.expires_at });
  } catch {
    return Response.json({ error: "Verify.MN төлөв шалгах үед алдаа гарлаа." }, { status: 502 });
  }
}
