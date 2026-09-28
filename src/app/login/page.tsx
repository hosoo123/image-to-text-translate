import { redirect } from "next/navigation";
import AuthForm from "@/app/ui/auth-form";
import { requireUser } from "@/lib/supabase/require-user";

export default async function LoginPage() {
  const { user } = await requireUser();
  if (user) redirect("/");
  return <AuthForm mode="login" />;
}
