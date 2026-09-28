import { createAdminClient } from "@/lib/supabase/admin";
import { phoneAuthEmail } from "@/lib/auth/phone-auth-email";

function normalizeMongolianPhone(value: unknown) {
  const phone = typeof value === "string" ? value.replace(/[\s()+-]/g, "") : "";
  const local = phone.startsWith("976") ? phone.slice(3) : phone;
  return /^\d{8}$/.test(local) ? local : null;
}

export async function POST(request: Request) {
  let body: { phone?: unknown; password?: unknown; sessionId?: unknown; purpose?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Мэдээлэл дутуу байна." }, { status: 400 }); }
  const phone = normalizeMongolianPhone(body.phone);
  const password = typeof body.password === "string" ? body.password : "";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const purpose = body.purpose === "password_reset" ? "password_reset" : "signup";
  if (!phone || !sessionId || password.length < 8 || password.length > 72) {
    return Response.json({ error: "Утасны дугаар болон 8–72 тэмдэгттэй нууц үг оруулна уу." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: pending, error: pendingError } = await admin.from("pending_phone_signups")
    .select("phone, purpose, expires_at").eq("session_id", sessionId).maybeSingle();
  if (pendingError || !pending || pending.phone !== phone || pending.purpose !== purpose) return Response.json({ error: "Баталгаажуулах хүсэлт тохирохгүй байна. Дахин эхлүүлнэ үү." }, { status: 400 });
  if (Date.parse(pending.expires_at) <= Date.now()) return Response.json({ error: "Баталгаажуулах хугацаа дууссан байна. Дахин эхлүүлнэ үү." }, { status: 410 });

  try {
    const verifyResponse = await fetch(`https://api.verify.mn/sessions/${encodeURIComponent(sessionId)}`, { cache: "no-store" });
    const verified = await verifyResponse.json();
    if (!verifyResponse.ok) return Response.json({ error: "Verify.MN баталгаажуулалт шалгаж чадсангүй." }, { status: 502 });
    if (verified.sessionStatus !== "VERIFIED") return Response.json({ error: "SMS баталгаажаагүй байна. 144773 руу илгээсний дараа дахин дарна уу." }, { status: 409 });

    if (purpose === "password_reset") {
      const { data: linkedPhone, error: lookupError } = await admin.from("user_phone_verifications").select("user_id").eq("phone", phone).maybeSingle();
      if (lookupError || !linkedPhone) return Response.json({ error: "Баталгаажсан утасны бүртгэл олдсонгүй." }, { status: 404 });
      const { error: updateError } = await admin.auth.admin.updateUserById(linkedPhone.user_id, { password });
      if (updateError) return Response.json({ error: "Нууц үг шинэчилж чадсангүй." }, { status: 503 });
      await admin.from("pending_phone_signups").delete().eq("session_id", sessionId);
      return Response.json({ passwordUpdated: true });
    }

    const { data: user, error: createError } = await admin.auth.admin.createUser({
      email: phoneAuthEmail(phone),
      password,
      email_confirm: true,
      user_metadata: { phone_signup: true },
    });
    if (createError || !user.user) {
      const duplicate = /already|exists|registered/i.test(createError?.message ?? "");
      return Response.json({ error: duplicate ? "Энэ утас бүртгэлтэй байна. Нэвтрэх хэсгийг ашиглана уу." : "Утасны бүртгэл үүсгэж чадсангүй." }, { status: duplicate ? 409 : 503 });
    }

    const { error: phoneError } = await admin.from("user_phone_verifications").insert({ user_id: user.user.id, phone, verified_at: new Date().toISOString() });
    if (phoneError) {
      await admin.auth.admin.deleteUser(user.user.id);
      return Response.json({ error: "Энэ дугаар өөр бүртгэлд ашиглагдсан байна." }, { status: 409 });
    }
    await admin.from("pending_phone_signups").delete().eq("session_id", sessionId);
    return Response.json({ created: true });
  } catch (error) {
    console.error("Phone signup completion error", error);
    return Response.json({ error: "Бүртгэл дуусгах үед алдаа гарлаа." }, { status: 503 });
  }
}
