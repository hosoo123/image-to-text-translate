"use client";

import { useState } from "react";
import { PLANS, formatMnt, type PlanCode } from "@/lib/billing/plans";
import Spinner from "@/app/ui/spinner";

export default function PlanCards() {
  const [busy, setBusy] = useState<PlanCode | null>(null);
  const [error, setError] = useState("");
  async function checkout(planCode: PlanCode) {
    setBusy(planCode); setError("");
    try {
      const response = await fetch("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planCode }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Төлбөр эхлүүлж чадсангүй.");
      window.location.assign(result.checkoutUrl);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Алдаа гарлаа."); setBusy(null); }
  }
  return <>
    <div className="grid gap-4 md:grid-cols-3">
      {(Object.entries(PLANS) as [PlanCode, (typeof PLANS)[PlanCode]][]).map(([code, plan]) => <article key={code} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        {"note" in plan && <p className="text-xs text-lime-300">{plan.note}</p>}
        <h2 className="mt-2 text-xl font-semibold">{plan.label}</h2>
        <p className="mt-1 text-2xl font-bold">{formatMnt(plan.priceMnt)}</p>
        <p className="mt-4 text-sm text-white/60">Өдөрт 100 хүртэл · Сард 2,000 AI хүсэлт</p>
        <button type="button" disabled={busy !== null} onClick={() => checkout(code)} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 py-3 font-semibold text-black disabled:opacity-60">{busy === code && <Spinner className="text-black" />}{busy === code ? "Төлбөр нээж байна…" : "QR-ээр төлөх"}</button>
      </article>)}
    </div>
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
  </>;
}
