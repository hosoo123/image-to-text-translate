import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/require-user";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const orderId = new URL(request.url).searchParams.get("orderId");
  if (!orderId) return Response.json({ error: "Захиалга олдсонгүй." }, { status: 400 });
  const { data, error } = await createAdminClient().from("payment_orders")
    .select("status, plan_code, price_mnt, paid_at").eq("id", orderId).eq("user_id", auth.user.id).maybeSingle();
  if (error || !data) return Response.json({ error: "Захиалга олдсонгүй." }, { status: 404 });
  return Response.json(data);
}
