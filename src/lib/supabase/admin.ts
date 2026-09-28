import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export function hasAdminConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) &&
      process.env.ADMIN_EMAILS?.trim(),
  );
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase admin тохиргоо дутуу байна.");
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function mongoliaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export type AdminUserUsage = {
  id: string;
  email: string;
  createdAt: string;
  analyzeCount: number;
  translateCount: number;
  dailyLimit: number;
  subscriptionExpiresAt: string | null;
};

export async function getAdminUsers(defaultLimit: number): Promise<AdminUserUsage[]> {
  const admin = createAdminClient();
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }

  const today = mongoliaDate();
  const [
    { data: usageRows, error: usageError },
    { data: limitRows, error: limitError },
    { data: phoneRows, error: phoneError },
    { data: subscriptionRows, error: subscriptionError },
  ] =
    await Promise.all([
      admin
        .from("user_daily_ai_usage")
        .select("user_id, analyze_count, translate_count")
        .eq("usage_date", today)
        .limit(10000),
      admin.from("user_ai_limits").select("user_id, daily_limit").limit(10000),
      admin.from("user_phone_verifications").select("user_id, phone").limit(10000),
      admin.from("user_subscriptions").select("user_id, expires_at").limit(10000),
    ]);
  if (usageError) throw usageError;
  if (limitError) throw limitError;
  if (phoneError) throw phoneError;
  if (subscriptionError) throw subscriptionError;

  const usageById = new Map(
    (usageRows ?? []).map((row) => [row.user_id, row]),
  );
  const limitById = new Map((limitRows ?? []).map((row) => [row.user_id, row.daily_limit]));
  const phoneById = new Map((phoneRows ?? []).map((row) => [row.user_id, row.phone]));
  const subscriptionById = new Map((subscriptionRows ?? []).map((row) => [row.user_id, row.expires_at]));
  return users
    .map((user) => {
      const usage = usageById.get(user.id);
      return {
        id: user.id,
        email: user.email?.endsWith("@phone-login.invalid")
          ? `+976${phoneById.get(user.id) ?? ""}`
          : user.email ?? "(имэйлгүй)",
        createdAt: user.created_at,
        analyzeCount: usage?.analyze_count ?? 0,
        translateCount: usage?.translate_count ?? 0,
        dailyLimit: limitById.get(user.id) ?? defaultLimit,
        subscriptionExpiresAt: subscriptionById.get(user.id) ?? null,
      };
    })
    .sort((a, b) => b.analyzeCount + b.translateCount - (a.analyzeCount + a.translateCount));
}
