import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function normalizeMongolianPhone(value: unknown) {
  const phone = typeof value === "string" ? value.replace(/[\s()+-]/g, "") : "";
  const local = phone.startsWith("976") ? phone.slice(3) : phone;
  return /^\d{8}$/.test(local) ? local : null;
}

export async function POST(request: Request) {
  let body: { phone?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Утас болон нууц үгээ оруулна уу." }, { status: 400 }); }
  const phone = normalizeMongolianPhone(body.phone);
  const password = typeof body.password === "string" ? body.password : "";
  if (!phone || password.length < 1 || password.length > 72) return Response.json({ error: "Утас эсвэл нууц үг буруу байна." }, { status: 400 });

  const admin = createAdminClient();
  const { data: linked, error: lookupError } = await admin.from("user_phone_verifications")
    .select("user_id").eq("phone", phone).maybeSingle();
  if (lookupError || !linked) return Response.json({ error: "Утас эсвэл нууц үг буруу байна." }, { status: 401 });

  const { data: authUser, error: userError } = await admin.auth.admin.getUserById(linked.user_id);
  if (userError || !authUser.user?.email) return Response.json({ error: "Утас эсвэл нууц үг буруу байна." }, { status: 401 });
  const email = authUser.user.email;

  // Sign in on the server so the SSR auth client writes its session into cookies.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) return Response.json({ error: "Утас эсвэл нууц үг буруу байна." }, { status: 401 });
  return Response.json({ signedIn: true });
}
