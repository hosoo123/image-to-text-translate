"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-next";
import PhoneAuth from "@/app/ui/phone-auth";
import Spinner from "@/app/ui/spinner";

export default function AuthForm({
  mode,
  next = "/workspace",
  initialError = "",
  initialMessage = "",
}: {
  mode: "login" | "signup";
  next?: string;
  initialError?: string;
  initialMessage?: string;
}) {
  const isSignup = mode === "signup";
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState(initialMessage);
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    setError("");
    if (!hasSupabaseConfig()) {
      setError(
        ".env.local файлд Supabase URL болон publishable key нэмээд серверээ дахин асаана уу.",
      );
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set("next", safeNextPath(next));
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo.toString() },
      });
      if (authError) throw authError;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Google-ээр нэвтрэхэд алдаа гарлаа.",
      );
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!hasSupabaseConfig()) {
      setError(
        ".env.local файлд Supabase URL болон publishable key нэмээд серверээ дахин асаана уу.",
      );
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      if (isSignup) {
        const emailRedirectTo = new URL(
          "/auth/callback",
          window.location.origin,
        );
        emailRedirectTo.searchParams.set("next", safeNextPath(next));
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: emailRedirectTo.toString() },
        });
        if (authError) throw authError;
        if (!data.session) {
          setMessage(
            "Бүртгэл үүслээ. Имэйл хаягаа баталгаажуулаад нэвтэрнэ үү.",
          );
          return;
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
      }
      window.location.assign(safeNextPath(next));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Нэвтрэх үед алдаа гарлаа.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-svh items-start justify-center px-3 py-4 sm:items-center sm:px-5 sm:py-12">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-black/30 p-5 shadow-2xl backdrop-blur sm:rounded-3xl sm:p-8">
        <Link href="/" className="text-sm text-lime-300">
          Manhwa AI Translator
        </Link>
        <h1 className="mt-4 text-2xl font-semibold sm:mt-6 sm:text-3xl">
          {isSignup ? "Бүртгүүлэх" : "Нэвтрэх"}
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Зургаа AI-аар уншуулж, Монгол хэл рүү орчуулаарай.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={signInWithGoogle}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-4 py-3 font-medium text-zinc-900 disabled:opacity-60 sm:mt-8"
        >
          {busy ? <Spinner className="text-zinc-600" /> : <span aria-hidden="true" className="text-lg font-bold">G</span>}
          {busy ? "Google-той холбож байна…" : `Google-ээр ${isSignup ? "бүртгүүлэх" : "нэвтрэх"}`}
        </button>
        <div className="my-5 flex items-center gap-3 text-xs text-white/40">
          <span className="h-px flex-1 bg-white/10" />
          эсвэл
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-black/20 p-1">
          <button
            type="button"
            aria-pressed={authMethod === "email"}
            onClick={() => { setAuthMethod("email"); setError(""); setMessage(""); }}
            className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${authMethod === "email" ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white/80"}`}
          >
            Имэйлээр
          </button>
          <button
            type="button"
            aria-pressed={authMethod === "phone"}
            onClick={() => { setAuthMethod("phone"); setError(""); setMessage(""); }}
            className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${authMethod === "phone" ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white/80"}`}
          >
            Утсаар
          </button>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
        {message && <p role="status" className="mt-4 text-sm text-lime-200">{message}</p>}
        {authMethod === "email" ? <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-sm">
            Имэйл
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-lime-300"
            />
          </label>
          <label className="block text-sm">
            Нууц үг
            <input
              required
              minLength={6}
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-lime-300"
            />
          </label>
          {!isSignup && (
            <div className="-mt-2 text-right">
              <Link
                href="/forgot-password"
                className="text-xs text-lime-300 underline"
              >
                Нууц үгээ мартсан уу?
              </Link>
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-lime-300 px-4 py-3 font-semibold text-black disabled:opacity-60"
          >
            {busy && <Spinner />}{busy ? "Түр хүлээнэ үү…" : isSignup ? "Бүртгүүлэх" : "Нэвтрэх"}
          </button>
        </form> : <PhoneAuth mode={mode} next={safeNextPath(next)} />}
        <p className="mt-6 text-sm text-white/60">
          {isSignup ? "Бүртгэлтэй юу?" : "Бүртгэлгүй юу?"}{" "}
          <Link
            className="text-lime-300 underline"
            href={`${isSignup ? "/login" : "/signup"}?next=${encodeURIComponent(safeNextPath(next))}`}
          >
            {isSignup ? "Нэвтрэх" : "Бүртгүүлэх"}
          </Link>
        </p>
      </section>
    </main>
  );
}
