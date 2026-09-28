import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getMyAiUsage } from "@/lib/supabase/usage";
import { isAdminEmail } from "@/lib/supabase/admin";

async function logout() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function AccountPage() {
  const { user, configured } = await requireUser();
  if (!configured || !user) redirect("/login");
  const usage = await getMyAiUsage();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
      <Link href="/" className="text-sm text-lime-300">← Manhwa AI Translator</Link>
      <h1 className="mt-8 text-3xl font-semibold">Миний бүртгэл</h1>
      <section className="mt-6 space-y-5 rounded-3xl border border-white/10 bg-black/30 p-6">
        <div><p className="text-sm text-white/50">Имэйл</p><p className="mt-1">{user.email}</p></div>
        <div><p className="text-sm text-white/50">Өнөөдрийн хэрэглээ</p><p className="mt-1">{usage ? `${usage.analyze_count + usage.translate_count} / ${usage.daily_limit} AI хүсэлт` : "Хэрэглээний SQL тохиргоог хүлээж байна."}</p>{usage && <p className="mt-1 text-xs text-white/50">Анализ {usage.analyze_count} · Орчуулга {usage.translate_count}</p>}</div>
        {isAdminEmail(user.email) && <Link href="/admin" className="inline-block text-sm text-lime-300 underline">Admin panel →</Link>}
        <form action={logout}><button className="rounded-xl border border-white/20 px-4 py-2 hover:bg-white/10">Гарах</button></form>
      </section>
    </main>
  );
}
