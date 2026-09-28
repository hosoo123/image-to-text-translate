import { requireUser } from "@/lib/supabase/require-user";
import {
  createAdminClient,
  getAdminUsers,
  hasAdminConfig,
  isAdminEmail,
} from "@/lib/supabase/admin";
import { dailyDefaultLimit } from "@/lib/supabase/usage";

async function authorizeAdmin() {
  const auth = await requireUser();
  if (!auth.configured) return { response: Response.json({ error: "Supabase тохиргоо дутуу." }, { status: 503 }) };
  if (!auth.user) return { response: Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 }) };
  if (!isAdminEmail(auth.user.email)) return { response: Response.json({ error: "Admin эрх шаардлагатай." }, { status: 403 }) };
  if (!hasAdminConfig()) return { response: Response.json({ error: "Admin тохиргоо дутуу байна." }, { status: 503 }) };
  return { user: auth.user };
}

export async function GET() {
  const auth = await authorizeAdmin();
  if ("response" in auth) return auth.response;
  try {
    return Response.json({ users: await getAdminUsers(dailyDefaultLimit()) });
  } catch (error) {
    console.error("Admin usage fetch failed:", error);
    return Response.json({ error: "Хэрэглэгчдийн мэдээлэл уншиж чадсангүй. Supabase migration-ээ шалгана уу." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const auth = await authorizeAdmin();
  if ("response" in auth) return auth.response;

  let body: { userId?: unknown; dailyLimit?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Хүсэлтийн өгөгдөл буруу байна." }, { status: 400 });
  }
  if (
    typeof body.userId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(body.userId) ||
    !Number.isInteger(body.dailyLimit) ||
    Number(body.dailyLimit) < 0 ||
    Number(body.dailyLimit) > 1000
  ) {
    return Response.json({ error: "User ID эсвэл лимит буруу байна. Лимит 0–1000 хооронд бүхэл тоо байна." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("user_ai_limits").upsert(
    {
      user_id: body.userId,
      daily_limit: body.dailyLimit,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    console.error("Admin limit update failed:", error);
    return Response.json({ error: "Хэрэглэгчийн лимит хадгалж чадсангүй." }, { status: 503 });
  }
  return Response.json({ success: true });
}
