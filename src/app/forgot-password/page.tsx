"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import PhonePasswordRecovery from "@/app/ui/phone-password-recovery";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!hasSupabaseConfig()) {
      setError("Supabase тохиргоо дутуу байна.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const redirectTo = new URL("/auth/reset-callback", window.location.origin);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo.toString(),
      });
      if (resetError) throw resetError;
      setMessage("Хэрэв энэ имэйл бүртгэлтэй бол нууц үг сэргээх холбоос илгээгдлээ. Имэйлээ шалгана уу.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Хүсэлт илгээж чадсангүй.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-svh items-start justify-center px-3 py-4 sm:items-center sm:px-5 sm:py-12">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-black/30 p-5 shadow-2xl backdrop-blur sm:rounded-3xl sm:p-8">
        <Link href="/login" className="text-sm text-lime-300">← Нэвтрэх</Link>
        <h1 className="mt-5 text-2xl font-semibold sm:mt-6 sm:text-3xl">Нууц үг сэргээх</h1>
        <p className="mt-2 text-sm text-white/60">Бүртгэлтэй имэйлээ оруулбал сэргээх холбоос илгээнэ.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block text-sm">Имэйл<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-lime-300" /></label>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          {message && <p role="status" className="text-sm text-lime-200">{message}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-lime-300 px-4 py-3 font-semibold text-black disabled:opacity-60">{busy ? "Илгээж байна…" : "Сэргээх холбоос илгээх"}</button>
        </form>
        <PhonePasswordRecovery />
      </section>
    </main>
  );
}
