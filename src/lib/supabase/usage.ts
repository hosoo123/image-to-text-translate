import { createClient } from "./server";

function dailyDefaultLimit() {
  const value = Number.parseInt(process.env.DAILY_AI_REQUEST_LIMIT ?? "20", 10);
  return Number.isFinite(value) ? Math.max(0, Math.min(value, 1000)) : 20;
}

export async function consumeAiUsage(kind: "analyze" | "translate") {
  const supabase = await createClient();
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
  const { data, error } = await supabase.rpc("get_my_daily_ai_usage", {
    p_default_limit: dailyDefaultLimit(),
  });
  if (error) return null;
  const result = Array.isArray(data) ? data[0] : data;
  return result as
    | { analyze_count: number; translate_count: number; daily_limit: number }
    | undefined;
}

export { dailyDefaultLimit };
