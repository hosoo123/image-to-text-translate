import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import AdminUsers from "@/app/ui/admin-users";
import { requireUser } from "@/lib/supabase/require-user";
import { hasAdminConfig, isAdminEmail } from "@/lib/supabase/admin";

export default async function AdminPage() {
  const auth = await requireUser();
  if (!auth.configured || !auth.user) redirect("/login");
  if (!isAdminEmail(auth.user.email)) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-5 sm:py-10">
      <Link href="/account" className="inline-flex min-h-11 items-center text-sm text-lime-300">← Бүртгэл рүү</Link>
      <h1 className="mt-5 text-2xl font-semibold sm:mt-6 sm:text-3xl">Admin panel</h1>
      <p className="mt-2 text-sm text-white/60">Хэрэглэгчдийн өнөөдрийн AI хэрэглээ болон өдөр тутмын лимит.</p>
      {!hasAdminConfig() ? (
        <p className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5 text-amber-100">
          .env.local файлд server-only SUPABASE_SECRET_KEY тохируулна уу. Үүнийг NEXT_PUBLIC_ хувьсагч болгож болохгүй.
        </p>
      ) : <AdminUsers />}
    </main>
  );
}
