"use client";

import { useEffect, useState } from "react";

export default function PaymentStatus({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState("Төлбөр баталгаажихыг шалгаж байна…");
  useEffect(() => {
    let stopped = false;
    let attempts = 0;
    const check = async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/payments/status?orderId=${encodeURIComponent(orderId)}`, { cache: "no-store" });
        const result = await response.json();
        if (stopped) return;
        if (result.status === "paid") { setStatus("Төлбөр баталгаажлаа. Premium эрх идэвхтэй боллоо."); return; }
        if (result.status === "pending") setStatus("Төлбөр хүлээгдэж байна. Баталгаажмагц эрх автоматаар идэвхжинэ.");
        else if (!response.ok) setStatus(result.error ?? "Төлбөрийн төлөв шалгаж чадсангүй.");
      } catch { if (!stopped) setStatus("Төлбөрийн төлөвийг дахин шалгана…"); }
      if (attempts < 20 && !stopped) window.setTimeout(check, 4000);
    };
    void check();
    return () => { stopped = true; };
  }, [orderId]);
  return <p role="status" className="rounded-xl border border-lime-300/20 bg-lime-300/5 p-4 text-sm text-lime-100">{status}</p>;
}
