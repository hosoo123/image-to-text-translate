import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getMyAiUsage } from "@/lib/supabase/usage";
import { isAdminEmail } from "@/lib/supabase/admin";
import { getMyPlanUsage } from "@/lib/supabase/usage";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import PhoneVerification from "@/app/ui/phone-verification";
import PaymentStatus from "@/app/ui/payment-status";

async function logout() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const params = await searchParams;
  const { user, configured } = await requireUser();
  if (!configured || !user) redirect("/login");
  const [usage, planUsage] = await Promise.all([getMyAiUsage(), getMyPlanUsage()]);
  const supabase = await createSupabaseClient();
  const { data: verifiedPhone } = await supabase.from("user_phone_verifications").select("phone").eq("user_id", user.id).maybeSingle();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-5 sm:py-12">
      <Link href="/" className="text-sm text-lime-300">← Manhwa AI Translator</Link>
      <h1 className="mt-6 text-2xl font-semibold sm:mt-8 sm:text-3xl">Миний бүртгэл</h1>
      <section className="mt-5 space-y-5 rounded-2xl border border-white/10 bg-black/30 p-4 sm:mt-6 sm:rounded-3xl sm:p-6">
        <div><p className="text-sm text-white/50">Бүртгэл</p><p className="mt-1 break-all">{user.email?.endsWith("@phone-login.invalid") ? `Утас · +976${verifiedPhone?.phone ?? ""}` : user.email}</p></div>
        <div><p className="text-sm text-white/50">Эрхийн төрөл</p><p className="mt-1">{planUsage?.plan_code === "free" || !planUsage ? "Free" : `Premium · ${new Date(planUsage.expires_at ?? "").toLocaleDateString("mn-MN")} хүртэл`}</p></div>
        <div><p className="text-sm text-white/50">Өнөөдрийн хэрэглээ</p><p className="mt-1">{usage ? `${usage.analyze_count + usage.translate_count} / ${usage.daily_limit} AI хүсэлт` : "Хэрэглээний SQL тохиргоог хүлээж байна."}</p>{usage && <p className="mt-1 text-xs text-white/50">Анализ {usage.analyze_count} · Орчуулга {usage.translate_count}</p>}{planUsage?.monthly_limit && <p className="mt-1 text-xs text-white/50">Энэ сарын хэрэглээ {planUsage.monthly_used} / {planUsage.monthly_limit}</p>}</div>
        {params.payment && <PaymentStatus orderId={params.payment} />}
        <Link href="/plans" className="inline-block rounded-xl bg-lime-300 px-4 py-2 font-medium text-black">Эрхийн багц харах →</Link>
        <PhoneVerification phone={verifiedPhone?.phone ?? null} />
        {isAdminEmail(user.email) && <Link href="/admin" className="inline-block text-sm text-lime-300 underline">Admin panel →</Link>}
        <form action={logout}><button className="rounded-xl border border-white/20 px-4 py-2 hover:bg-white/10">Гарах</button></form>
      </section>
    </main>
  );
}
