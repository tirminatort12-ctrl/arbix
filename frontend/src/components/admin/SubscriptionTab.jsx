import { useEffect, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SubBadge } from "@/components/Badges";
import { api, errMsg, fmtDate } from "@/lib/api";

const zl = (n) => `${Number(n).toLocaleString("pl-PL")} zł`;

export default function SubscriptionTab({ overview }) {
  const [cycle, setCycle] = useState("year");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const g = overview.gmina;
  const plan = g.plan_info;
  useEffect(() => { api.get("/billing/history").then((r) => setHistory(r.data)).catch(() => {}); }, []);

  const pay = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/billing/checkout", { cycle, origin_url: window.location.origin });
      window.location.href = data.checkout_url;
    } catch (e) { toast.error(errMsg(e)); setBusy(false); }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-2xl border border-emerald-100 bg-white p-6" data-testid="subscription-status-card">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status subskrypcji</div>
        <div className="mt-2 flex items-center gap-3"><SubBadge value={g.subscription.status} testId="admin-subscription-status" /></div>
        <p className="mt-3 text-sm text-slate-600">
          {g.subscription.until ? <>Ważna do <b data-testid="admin-subscription-until">{fmtDate(g.subscription.until)}</b>.</> : g.subscription.active ? "Bezterminowo." : "Mieszkańcy i pracownicy widzą komunikat „Serwis tymczasowo niedostępny”."}
        </p>
        <p className="mt-4 text-sm text-slate-600">Pakiet: <b>{plan?.name}</b> ({plan?.desc})</p>
        {history.length > 0 && (
          <div className="mt-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Płatności</div>
            <ul className="mt-2 space-y-1 text-sm text-slate-600" data-testid="billing-history">
              {history.map((h) => <li key={`${h.created_at}-${h.amount}`}>{fmtDate(h.created_at)} · {h.cycle === "year" ? "rocznie" : "miesięcznie"} · {zl(h.amount)}</li>)}
            </ul>
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-emerald-100 bg-white p-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Opłać kartą</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[["month", "Miesięcznie", plan?.month], ["year", "Rocznie", plan?.year]].map(([k, l, price]) => (
            <button key={k} data-testid={`subscription-cycle-${k}`} onClick={() => setCycle(k)}
              className={`rounded-2xl border p-4 text-left transition-colors ${cycle === k ? "border-[#2D6A4F] bg-emerald-50" : "border-emerald-100 hover:bg-emerald-50/50"}`}>
              <div className="text-sm font-semibold text-slate-700">{l}</div>
              <div className="mt-1 font-display text-2xl font-bold text-[#1B4332]">{price ? zl(price) : "—"}</div>
              <div className="text-xs text-slate-500">netto {k === "year" ? "/ rok · 2 miesiące gratis" : "/ miesiąc"}</div>
            </button>
          ))}
        </div>
        <Button data-testid="subscription-stripe-pay-button" onClick={pay} disabled={busy} className="mt-4 h-12 w-full rounded-xl text-base">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}Przejdź do płatności
        </Button>
        <p className="mt-3 text-xs text-slate-500">Subskrypcja odnawia się automatycznie. Płatność przelewem lub na fakturę? Skontaktuj się z operatorem platformy — włączy subskrypcję ręcznie.</p>
      </div>
    </div>
  );
}
