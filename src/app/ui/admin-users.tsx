"use client";

import { useEffect, useState } from "react";
import type { AdminUserUsage } from "@/lib/supabase/admin";

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUserUsage[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Мэдээлэл уншиж чадсангүй.");
        setUsers(result.users);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Алдаа гарлаа."));
  }, []);

  async function saveLimit(userId: string, dailyLimit: number) {
    setSaving(userId);
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

  return (
    <section className="mt-7">
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
      {!users.length && !error ? <p className="text-sm text-white/60">Ачаалж байна…</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-white/5 text-white/60"><tr><th className="p-4">Имэйл</th><th className="p-4">Бүртгүүлсэн</th><th className="p-4">Анализ</th><th className="p-4">Орчуулга</th><th className="p-4">Өдрийн лимит</th></tr></thead>
          <tbody>{users.map((user) => <LimitRow key={user.id} user={user} saving={saving === user.id} onSave={saveLimit} />)}</tbody>
        </table>
      </div>
    </section>
  );
}

function LimitRow({ user, saving, onSave }: { user: AdminUserUsage; saving: boolean; onSave: (id: string, limit: number) => void }) {
  const [limit, setLimit] = useState(String(user.dailyLimit));
  return (
    <tr className="border-t border-white/10">
      <td className="p-4">{user.email}</td>
      <td className="p-4 text-white/60">{new Date(user.createdAt).toLocaleDateString("mn-MN")}</td>
      <td className="p-4">{user.analyzeCount}</td>
      <td className="p-4">{user.translateCount}</td>
      <td className="p-4"><form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); onSave(user.id, Number(limit)); }}>
        <input aria-label={`${user.email} өдрийн лимит`} type="number" min="0" max="1000" value={limit} onChange={(event) => setLimit(event.target.value)} className="w-24 rounded-lg border border-white/15 bg-white/5 px-3 py-2" />
        <button type="submit" disabled={saving || !Number.isInteger(Number(limit)) || Number(limit) < 0 || Number(limit) > 1000} className="rounded-lg bg-lime-300 px-3 py-2 font-medium text-black disabled:opacity-50">{saving ? "…" : "Хадгалах"}</button>
      </form></td>
    </tr>
  );
}
