import { redirect } from "next/navigation";
import AuthForm from "@/app/ui/auth-form";
import { requireUser } from "@/lib/supabase/require-user";
import { safeNextPath } from "@/lib/safe-next";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const params = await searchParams;
  const next = safeNextPath(Array.isArray(params.next) ? params.next[0] : params.next);
  const { user } = await requireUser();
  if (user) redirect(next);
  return <AuthForm mode="signup" next={next} />;
}
