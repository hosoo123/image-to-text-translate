"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    if (search.has("oauth_error")) {
      setError("Google-ээр нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.");
    }
    if (search.has("password_updated")) setMessage("Нууц үг шинэчлэгдлээ. Шинэ нууц үгээрээ нэвтэрнэ үү.");
  }, []);

  async function signInWithGoogle() {
    setError("");
    if (!hasSupabaseConfig()) {
      setError(".env.local файлд Supabase URL болон publishable key нэмээд серверээ дахин асаана уу.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) throw authError;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google-ээр нэвтрэхэд алдаа гарлаа.");
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!hasSupabaseConfig()) {
      setError(".env.local файлд Supabase URL болон publishable key нэмээд серверээ дахин асаана уу.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      if (isSignup) {
        const { data, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
        if (!data.session) {
          setMessage("Бүртгэл үүслээ. Имэйл хаягаа баталгаажуулаад нэвтэрнэ үү.");
          return;
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      }
      window.location.assign("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Нэвтрэх үед алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-black/30 p-8 shadow-2xl backdrop-blur">
        <Link href="/" className="text-sm text-lime-300">Manhwa AI Translator</Link>
        <h1 className="mt-6 text-3xl font-semibold">{isSignup ? "Бүртгүүлэх" : "Нэвтрэх"}</h1>
        <p className="mt-2 text-sm text-white/60">Зургаа AI-аар уншуулж, Монгол хэл рүү орчуулаарай.</p>
        <button type="button" disabled={busy} onClick={signInWithGoogle} className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-4 py-3 font-medium text-zinc-900 disabled:opacity-60">
          <span aria-hidden="true" className="text-lg font-bold">G</span>
          Google-ээр {isSignup ? "бүртгүүлэх" : "нэвтрэх"}
        </button>
        <div className="my-5 flex items-center gap-3 text-xs text-white/40"><span className="h-px flex-1 bg-white/10" />эсвэл имэйлээр<span className="h-px flex-1 bg-white/10" /></div>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block text-sm">Имэйл<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-lime-300" /></label>
          <label className="block text-sm">Нууц үг<input required minLength={6} type="password" autoComplete={isSignup ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-lime-300" /></label>
          {!isSignup && <div className="-mt-2 text-right"><Link href="/forgot-password" className="text-xs text-lime-300 underline">Нууц үгээ мартсан уу?</Link></div>}
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          {message && <p role="status" className="text-sm text-lime-200">{message}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-lime-300 px-4 py-3 font-semibold text-black disabled:opacity-60">{busy ? "Түр хүлээнэ үү…" : isSignup ? "Бүртгүүлэх" : "Нэвтрэх"}</button>
        </form>
        <p className="mt-6 text-sm text-white/60">{isSignup ? "Бүртгэлтэй юу?" : "Бүртгэлгүй юу?"} <Link className="text-lime-300 underline" href={isSignup ? "/login" : "/signup"}>{isSignup ? "Нэвтрэх" : "Бүртгүүлэх"}</Link></p>
      </section>
    </main>
  );
}
