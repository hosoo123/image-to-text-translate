import { createClient } from "./server";
import { hasSupabaseConfig } from "./config";

export async function requireUser() {
  if (!hasSupabaseConfig()) {
    return { user: null, configured: false as const };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return { user: error ? null : data.user, configured: true as const };
}
