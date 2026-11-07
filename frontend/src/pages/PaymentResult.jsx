import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function PaymentResult({ ok }) {
  const [sp] = useSearchParams();
  const sid = sp.get("session_id");
  const [state, setState] = useState(ok ? "checking" : "cancel");
  const { refresh } = useAuth();

  useEffect(() => {
    if (!ok || !sid) return;
    let n = 0, stop = false;
    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/status/${sid}`);
        if (data.payment_status === "paid") { setState("paid"); refresh(); return; }
        if (["expired", "failed"].includes(data.payment_status)) return setState("failed");
      } catch (e) {
        console.error("Payment status check failed, retrying", e);
      }
      if (!stop && ++n < 15) setTimeout(poll, 2000); else setState("timeout");
    };
    poll();
    return () => { stop = true; };
  }, [ok, sid, refresh]);

  const view = {
    checking: [Loader2, "Sprawdzamy płatność…", "To potrwa kilka sekund.", "animate-spin text-slate-500"],
    paid: [CheckCircle2, "Subskrypcja aktywna", "Dziękujemy! Płatność została potwierdzona, odnowienie nastąpi automatycznie.", "text-emerald-600"],
    failed: [XCircle, "Płatność nieudana", "Spróbuj ponownie w zakładce Subskrypcja.", "text-rose-600"],
    timeout: [Loader2, "Płatność w trakcie przetwarzania", "Odśwież stronę za chwilę.", "text-amber-600"],
    cancel: [XCircle, "Płatność anulowana", "Nie pobrano żadnych środków.", "text-slate-500"],
  }[state];
  const [Icon, title, text, cls] = view;
  return (
    <Shell>
      <div className="rise mx-auto max-w-md rounded-3xl border border-emerald-100 bg-white p-8 text-center" data-testid={`payment-result-${state}`}>
        <Icon className={`mx-auto h-12 w-12 ${cls}`} />
        <h1 className="mt-4 text-2xl font-bold text-slate-800">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{text}</p>
        <Link to="/app" data-testid="payment-back-to-dashboard" className="mt-6 inline-flex h-12 items-center rounded-full bg-[#2D6A4F] px-6 font-semibold text-white">Wróć do panelu</Link>
      </div>
    </Shell>
  );
}
