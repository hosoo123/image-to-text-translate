"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { safeNextPath } from "@/lib/safe-next";

type Props = { mode: "login" | "signup"; next: string };
type VerifySession = { sessionId: string; smsUri: string; instruction: string; expiresAt: string };

function toE164(raw: string) {
  const digits = raw.replace(/[\s()+-]/g, "");
  const local = digits.startsWith("976") ? digits.slice(3) : digits;
  return /^\d{8}$/.test(local) ? `+976${local}` : null;
}

export default function PhoneAuth({ mode, next }: Props) {
  const isSignup = mode === "signup";
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<VerifySession | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const normalizedPhone = toE164(phone);
    if (!normalizedPhone) { setError("Монголын 8 оронтой дугаар оруулна уу."); return; }
    if (password.length < 8) { setError("Нууц үг хамгийн багадаа 8 тэмдэгт байна."); return; }
    setBusy(true);
    try {
      if (!isSignup) {
        const response = await fetch("/api/auth/phone-login", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone, password }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Утас эсвэл нууц үг буруу байна.");
        window.location.assign(safeNextPath(next));
        return;
      }

      if (!session) {
        const response = await fetch("/api/auth/phone-signup/session", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone, purpose: "signup" }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Утас баталгаажуулж чадсангүй.");
        setSession(result);
        return;
      }

      if (Date.now() > Date.parse(session.expiresAt)) throw new Error("Баталгаажуулах хугацаа дууссан байна. Шинээр эхлүүлнэ үү.");
      const completeResponse = await fetch("/api/auth/phone-signup/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, password, sessionId: session.sessionId, purpose: "signup" }),
      });
      const complete = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(complete.error ?? "Бүртгэл дуусгаж чадсангүй.");
      const signInResponse = await fetch("/api/auth/phone-login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, password }),
      });
      const signIn = await signInResponse.json();
      if (!signInResponse.ok) throw new Error("Бүртгэл үүслээ. Нэвтрэх хэсгээс утас, нууц үгээрээ орно уу.");
      window.location.assign(safeNextPath(next));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Утасны нэвтрэлтэд алдаа гарлаа.");
    } finally { setBusy(false); }
  }

  return <div className="mt-5">
    {isSignup && <p className="mb-4 text-xs leading-5 text-white/55">Verify.MN-ээр утсаа баталгаажуулна. SMS-д операторын тариф бодогдож болно.</p>}
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm">Утасны дугаар
        <input required inputMode="tel" autoComplete="tel" placeholder="99112233" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-2 outline-none focus:border-lime-300" />
      </label>
      <label className="block text-sm">Нууц үг
        <input required minLength={8} maxLength={72} type="password" autoComplete={isSignup ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-2 outline-none focus:border-lime-300" />
      </label>
      {!isSignup && <div className="-mt-2 text-right"><Link href="/forgot-password" className="text-xs text-lime-300 underline">Нууц үгээ мартсан уу?</Link></div>}
      {session && <div className="space-y-3 rounded-xl border border-lime-300/20 bg-lime-300/5 p-3">
        <p className="text-sm">{session.instruction}</p>
        <a href={session.smsUri} className="inline-flex rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900">SMS нээх</a>
        <p className="text-xs text-white/55">SMS илгээсний дараа доорх товчоор бүртгэлээ дуусгана. Кодыг бид нууц үгтэй хамт хадгалахгүй.</p>
      </div>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-lime-300 px-4 py-3 font-semibold text-black disabled:opacity-60">
        {busy ? "Түр хүлээнэ үү…" : isSignup ? session ? "SMS-ээ илгээсэн · Бүртгэл дуусгах" : "Дугаараа баталгаажуулах" : "Утсаар нэвтрэх"}
      </button>
      {session && <button type="button" onClick={() => { setSession(null); setError(""); }} className="w-full text-xs text-white/55 underline">Баталгаажуулалтыг шинээр эхлүүлэх</button>}
    </form>
  </div>;
}
