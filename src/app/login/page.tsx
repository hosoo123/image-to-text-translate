import { redirect } from "next/navigation";
import AuthForm from "@/app/ui/auth-form";
import { requireUser } from "@/lib/supabase/require-user";
import { safeNextPath } from "@/lib/safe-next";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; oauth_error?: string; setup?: string; password_updated?: string }> }) {
  const params = await searchParams;
  const next = safeNextPath(Array.isArray(params.next) ? params.next[0] : params.next);
  const { user } = await requireUser();
  if (user) redirect(next);
  const initialError = params.oauth_error
    ? "Google-ээр нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу."
    : params.setup
      ? "Supabase-ийн URL болон publishable key тохируулаад серверээ дахин асаана уу."
      : "";
  const initialMessage = params.password_updated
    ? "Нууц үг шинэчлэгдлээ. Шинэ нууц үгээрээ нэвтэрнэ үү."
    : "";
  return <AuthForm mode="login" next={next} initialError={initialError} initialMessage={initialMessage} />;
}
