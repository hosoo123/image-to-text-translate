"use client";

import { useState, type FormEvent } from "react";

type VerifySession = { sessionId: string; smsUri: string; instruction: string; expiresAt: string };

export default function PhonePasswordRecovery() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<VerifySession | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (password.length < 8) { setError("Нууц үг хамгийн багадаа 8 тэмдэгт байна."); return; }
    setBusy(true);
    try {
      const endpoint = session ? "/api/auth/phone-signup/complete" : "/api/auth/phone-signup/session";
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session
          ? { phone, password, sessionId: session.sessionId, purpose: "password_reset" }
          : { phone, purpose: "password_reset" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Нууц үг сэргээж чадсангүй.");
      if (!session) setSession(result);
      else { setSession(null); setPassword(""); setMessage("Нууц үг шинэчлэгдлээ. Утас болон шинэ нууц үгээрээ нэвтэрнэ үү."); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Хүсэлт амжилтгүй."); }
    finally { setBusy(false); }
  }

  return <section className="mt-7 border-t border-white/10 pt-6">
    <h2 className="font-medium">Утасны бүртгэлийн нууц үг сэргээх</h2>
    <p className="mt-1 text-xs leading-5 text-white/55">Verify.MN-р дугаараа шалгаад шинэ нууц үг үүсгэнэ. SMS илгээхэд операторын тариф бодогдож болно.</p>
    <form onSubmit={submit} className="mt-4 space-y-3">
      <label className="block text-sm">Утасны дугаар<input required inputMode="tel" placeholder="99112233" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2" /></label>
      <label className="block text-sm">Шинэ нууц үг<input required minLength={8} maxLength={72} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2" /></label>
      {session && <div className="rounded-xl border border-lime-300/20 bg-lime-300/5 p-3"><p className="text-sm">{session.instruction}</p><a href={session.smsUri} className="mt-3 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900">SMS нээх</a><p className="mt-2 text-xs text-white/55">SMS илгээсний дараа доорх товчийг дахин дарна уу.</p></div>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {message && <p role="status" className="text-sm text-lime-200">{message}</p>}
      <button disabled={busy} className="w-full rounded-xl border border-white/15 px-4 py-3 text-sm disabled:opacity-60">{busy ? "Шалгаж байна…" : session ? "SMS-ээ илгээсэн · Нууц үг шинэчлэх" : "Баталгаажуулах SMS авах"}</button>
      {session && <button type="button" onClick={() => setSession(null)} className="w-full text-xs text-white/50 underline">Шинээр эхлүүлэх</button>}
    </form>
  </section>;
}
