import { createClient } from "./server";
import { isAdminEmail } from "./admin";

function dailyDefaultLimit() {
  const value = Number.parseInt(process.env.DAILY_AI_REQUEST_LIMIT ?? "20", 10);
  return Number.isFinite(value) ? Math.max(0, Math.min(value, 1000)) : 20;
}

export async function consumeAiUsage(kind: "analyze" | "translate") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (isAdminEmail(user?.email)) {
    return { allowed: true, used: 0, daily_limit: Number.MAX_SAFE_INTEGER };
  }

  const { data, error } = await supabase.rpc("consume_daily_ai_usage", {
    p_kind: kind,
    p_default_limit: dailyDefaultLimit(),
  });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  return result as { allowed: boolean; used: number; daily_limit: number };
}

export async function getMyAiUsage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_plan_usage", {
    p_default_limit: dailyDefaultLimit(),
  });
  if (error) return null;
  const result = Array.isArray(data) ? data[0] : data;
  return result as
    | { analyze_count: number; translate_count: number; daily_limit: number }
    | undefined;
}

export async function getMyPlanUsage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_plan_usage", {
    p_default_limit: dailyDefaultLimit(),
  });
  if (error) return null;
  const result = Array.isArray(data) ? data[0] : data;
  return result as {
    analyze_count: number;
    translate_count: number;
    daily_limit: number;
    plan_code: string;
    expires_at: string | null;
    monthly_used: number;
    monthly_limit: number | null;
  } | undefined;
}

export { dailyDefaultLimit };
