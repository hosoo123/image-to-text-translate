"use client";

import { useEffect, useState } from "react";
import type { AdminUserUsage } from "@/lib/supabase/admin";
import Spinner from "@/app/ui/spinner";

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUserUsage[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<{ userId: string; action: "limit" | "grant" } | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Мэдээлэл уншиж чадсангүй.");
        setUsers(result.users);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Алдаа гарлаа."))
      .finally(() => setLoadingUsers(false));
  }, []);

  async function saveLimit(userId: string, dailyLimit: number) {
    setSaving({ userId, action: "limit" });
    setError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, dailyLimit }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Лимит хадгалж чадсангүй.");
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, dailyLimit } : user));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Алдаа гарлаа.");
    } finally {
      setSaving(null);
    }
  }

  async function grantMonth(userId: string) {
    const target = users.find((user) => user.id === userId);
    if (!target || !window.confirm(`${target.email} хэрэглэгчид 1 сарын Premium эрх үнэгүй өгөх үү?`)) return;
    setSaving({ userId, action: "grant" });
    setError("");
    try {
      const response = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Эрх нэмж чадсангүй.");
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, subscriptionExpiresAt: result.expiresAt } : user));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Алдаа гарлаа.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="mt-7">
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
      {loadingUsers && <div role="status" className="mb-3 flex items-center gap-2 text-sm text-white/60"><Spinner className="text-lime-300" />Хэрэглэгчдийн мэдээлэл татаж байна…</div>}
      {!loadingUsers && !users.length && !error && <p className="mb-3 text-sm text-white/60">Хэрэглэгч олдсонгүй.</p>}
      {loadingUsers && <div aria-hidden="true" className="space-y-3 sm:hidden">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />)}</div>}
      {!loadingUsers && <div className="space-y-3 sm:hidden">{users.map((user) => <UserCard key={user.id} user={user} savingLimit={saving?.userId === user.id && saving.action === "limit"} granting={saving?.userId === user.id && saving.action === "grant"} onSave={saveLimit} onGrantMonth={grantMonth} />)}</div>}
      <div className="hidden overflow-x-auto rounded-2xl border border-white/10 sm:block">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-white/5 text-white/60"><tr><th className="p-4">Имэйл / утас</th><th className="p-4">Бүртгүүлсэн</th><th className="p-4">Анализ</th><th className="p-4">Орчуулга</th><th className="p-4">Өдрийн лимит</th><th className="p-4">Premium эрх</th><th className="p-4">Үйлдэл</th></tr></thead>
          <tbody>{loadingUsers ? Array.from({ length: 5 }, (_, index) => <tr key={index} className="border-t border-white/10">{Array.from({ length: 7 }, (_, cell) => <td key={cell} className="p-4"><span className="block h-4 animate-pulse rounded bg-white/10" /></td>)}</tr>) : users.map((user) => <LimitRow key={user.id} user={user} savingLimit={saving?.userId === user.id && saving.action === "limit"} granting={saving?.userId === user.id && saving.action === "grant"} onSave={saveLimit} onGrantMonth={grantMonth} />)}</tbody>
        </table>
      </div>
    </section>
  );
}

function LimitRow({ user, savingLimit, granting, onSave, onGrantMonth }: { user: AdminUserUsage; savingLimit: boolean; granting: boolean; onSave: (id: string, limit: number) => void; onGrantMonth: (id: string) => void }) {
  const [limit, setLimit] = useState(String(user.dailyLimit));
  return (
    <tr className="border-t border-white/10">
      <td className="p-4">{user.email}</td>
      <td className="p-4 text-white/60">{new Date(user.createdAt).toLocaleDateString("mn-MN")}</td>
      <td className="p-4">{user.analyzeCount}</td>
      <td className="p-4">{user.translateCount}</td>
      <td className="p-4"><form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); onSave(user.id, Number(limit)); }}>
        <input aria-label={`${user.email} өдрийн лимит`} type="number" min="0" max="1000" value={limit} onChange={(event) => setLimit(event.target.value)} className="w-24 rounded-lg border border-white/15 bg-white/5 px-3 py-2" />
        <button type="submit" disabled={savingLimit || granting || !Number.isInteger(Number(limit)) || Number(limit) < 0 || Number(limit) > 1000} className="inline-flex items-center gap-2 rounded-lg bg-lime-300 px-3 py-2 font-medium text-black disabled:opacity-50">{savingLimit && <Spinner className="h-3.5 w-3.5" />}{savingLimit ? "Хадгалж байна…" : "Хадгалах"}</button>
      </form></td>
      <td className="p-4">{user.subscriptionExpiresAt && Date.parse(user.subscriptionExpiresAt) > Date.now() ? `Premium · ${new Date(user.subscriptionExpiresAt).toLocaleDateString("mn-MN")} хүртэл` : "Free"}</td>
      <td className="p-4"><button type="button" disabled={savingLimit || granting} onClick={() => onGrantMonth(user.id)} className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-lime-300/30 px-3 py-2 text-lime-200 hover:bg-lime-300/10 disabled:opacity-50">{granting && <Spinner className="h-3.5 w-3.5" />}{granting ? "Эрх нэмж байна…" : "1 сар үнэгүй өгөх"}</button></td>
    </tr>
  );
}

function UserCard({ user, savingLimit, granting, onSave, onGrantMonth }: { user: AdminUserUsage; savingLimit: boolean; granting: boolean; onSave: (id: string, limit: number) => void; onGrantMonth: (id: string) => void }) {
  const [limit, setLimit] = useState(String(user.dailyLimit));
  const hasPremium = Boolean(user.subscriptionExpiresAt && Date.parse(user.subscriptionExpiresAt) > Date.now());
  return (
    <article className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="min-w-0">
        <p className="break-all font-medium">{user.email}</p>
        <p className="mt-1 text-xs text-white/50">Бүртгүүлсэн {new Date(user.createdAt).toLocaleDateString("mn-MN")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <p className="rounded-xl bg-black/20 p-3"><span className="block text-xs text-white/50">Анализ</span><span className="mt-1 block font-semibold">{user.analyzeCount}</span></p>
        <p className="rounded-xl bg-black/20 p-3"><span className="block text-xs text-white/50">Орчуулга</span><span className="mt-1 block font-semibold">{user.translateCount}</span></p>
      </div>
      <form className="flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); onSave(user.id, Number(limit)); }}>
        <label className="min-w-0 flex-1 text-xs text-white/60">Өдрийн AI лимит
          <input aria-label={`${user.email} өдрийн лимит`} type="number" min="0" max="1000" value={limit} onChange={(event) => setLimit(event.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white" />
        </label>
        <button type="submit" disabled={savingLimit || granting || !Number.isInteger(Number(limit)) || Number(limit) < 0 || Number(limit) > 1000} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-lime-300 px-3 py-2 font-medium text-black disabled:opacity-50">{savingLimit && <Spinner className="h-3.5 w-3.5" />}{savingLimit ? "Хадгалж байна…" : "Хадгалах"}</button>
      </form>
      <div className="flex flex-col gap-2 border-t border-white/10 pt-3 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
        <p className="text-xs text-white/60">{hasPremium ? `Premium · ${new Date(user.subscriptionExpiresAt!).toLocaleDateString("mn-MN")} хүртэл` : "Free эрх"}</p>
        <button type="button" disabled={savingLimit || granting} onClick={() => onGrantMonth(user.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-lime-300/30 px-3 py-2 text-sm text-lime-200 hover:bg-lime-300/10 disabled:opacity-50">{granting && <Spinner className="h-3.5 w-3.5" />}{granting ? "Эрх нэмж байна…" : "1 сар үнэгүй өгөх"}</button>
      </div>
    </article>
  );
}
