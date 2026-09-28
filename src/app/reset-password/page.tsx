"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Нууц үгнүүд таарахгүй байна.");
      return;
    }
    if (!hasSupabaseConfig()) {
      setError("Supabase тохиргоо дутуу байна.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !user) throw new Error("Сэргээх холбоос хүчингүй эсвэл хугацаа нь дууссан байна. Дахин хүсэлт илгээнэ үү.");
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      window.location.assign("/login?password_updated=1");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Нууц үг шинэчилж чадсангүй.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-black/30 p-8 shadow-2xl backdrop-blur">
        <h1 className="text-3xl font-semibold">Шинэ нууц үг</h1>
        <p className="mt-2 text-sm text-white/60">Шинэ нууц үгээ хоёр удаа оруулна уу.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block text-sm">Шинэ нууц үг<input required minLength={6} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-lime-300" /></label>
          <label className="block text-sm">Давтаж оруулах<input required minLength={6} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-lime-300" /></label>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-lime-300 px-4 py-3 font-semibold text-black disabled:opacity-60">{busy ? "Хадгалж байна…" : "Нууц үг шинэчлэх"}</button>
        </form>
        <Link href="/login" className="mt-5 inline-block text-sm text-lime-300 underline">Нэвтрэх хуудас руу</Link>
      </section>
    </main>
  );
}
