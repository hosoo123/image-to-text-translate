import { requireUser } from "@/lib/supabase/require-user";
import { createAdminClient, hasAdminConfig, isAdminEmail } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.configured) return Response.json({ error: "Supabase тохиргоо дутуу." }, { status: 503 });
  if (!auth.user) return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  if (!isAdminEmail(auth.user.email)) return Response.json({ error: "Admin эрх шаардлагатай." }, { status: 403 });
  if (!hasAdminConfig()) return Response.json({ error: "Admin тохиргоо дутуу байна." }, { status: 503 });

  let body: { userId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Хүсэлтийн өгөгдөл буруу байна." }, { status: 400 });
  }
  if (typeof body.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.userId)) {
    return Response.json({ error: "Хэрэглэгчийн ID буруу байна." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("grant_admin_subscription_month", {
      p_user_id: body.userId,
      p_admin_user_id: auth.user.id,
    });
    if (error) throw error;
    if (!data || typeof data.expires_at !== "string") throw new Error("Эрхийн хугацаа буцаагдсангүй.");
    return Response.json({ success: true, expiresAt: data.expires_at });
  } catch (error) {
    console.error("Admin subscription grant failed:", error);
    return Response.json({ error: "1 сарын эрх нэмж чадсангүй. Migration ажилласан эсэхийг шалгана уу." }, { status: 503 });
  }
}
