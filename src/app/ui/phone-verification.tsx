"use client";

import { useEffect, useState } from "react";
import Spinner from "@/app/ui/spinner";

type Session = { sessionId: string; smsUri: string; instruction: string; expiresAt: string };

export default function PhoneVerification({ phone }: { phone: string | null }) {
  const [number, setNumber] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    let stopped = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/phone-verification?sessionId=${encodeURIComponent(session.sessionId)}`, { cache: "no-store" });
        const result = await response.json();
        if (stopped) return;
        if (result.status === "VERIFIED") {
          setMessage("Утас амжилттай баталгаажлаа.");
          setSession(null);
          window.location.reload();
          return;
        }
        if (result.status === "EXPIRED" || Date.now() > Date.parse(session.expiresAt)) {
          setMessage("Баталгаажуулах хугацаа дууслаа. Дахин эхлүүлнэ үү.");
          setSession(null);
        }
      } catch { /* next poll retries */ }
    };
    const timer = window.setInterval(poll, 3000);
    void poll();
    return () => { stopped = true; window.clearInterval(timer); };
  }, [session]);

  async function begin() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/phone-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: number }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Баталгаажуулалт эхлүүлж чадсангүй.");
      setSession(result);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Алдаа гарлаа."); }
    finally { setBusy(false); }
  }

  if (phone) return <div className="rounded-xl border border-lime-300/20 bg-lime-300/5 p-4"><p className="text-sm text-lime-200">Баталгаажсан утас: {phone}</p></div>;

  return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
    <h2 className="font-medium">Утас баталгаажуулах <span className="text-xs text-white/45">(сонголттой)</span></h2>
    <p className="mt-1 text-xs leading-5 text-white/55">Verify.MN нь таны дугаар луу мессеж илгээхгүй. Та 144773 руу SMS илгээнэ; таны операторын SMS тарифаар төлбөр бодогдож болно.</p>
    {!session && <form onSubmit={(event) => { event.preventDefault(); void begin(); }} className="mt-3 flex flex-col gap-2 sm:flex-row"><input required aria-label="Утасны дугаар" inputMode="tel" placeholder="99112233" value={number} onChange={(event) => setNumber(event.target.value)} className="min-h-11 flex-1 rounded-lg border border-white/15 bg-black/30 px-3" /><button type="submit" disabled={busy || !number.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2 disabled:opacity-50">{busy && <Spinner />}{busy ? "Хүсэлт илгээж байна…" : "Баталгаажуулах"}</button></form>}
    {session && <div className="mt-3 space-y-2"><p className="text-sm">{session.instruction}</p><a href={session.smsUri} className="inline-flex rounded-lg bg-lime-300 px-4 py-2 font-medium text-black">SMS нээх</a><div role="status" className="flex items-center gap-2 text-xs text-white/60"><Spinner className="text-lime-300" />SMS илгээсний дараа дугаарын баталгааг шалгаж байна…</div><button type="button" onClick={() => setSession(null)} className="block text-xs underline text-white/50">Цуцлах</button></div>}
    {message && <p role="status" className="mt-3 text-sm text-white/70">{message}</p>}
  </div>;
}
