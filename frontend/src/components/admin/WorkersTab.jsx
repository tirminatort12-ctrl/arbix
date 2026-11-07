import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CodeDialog } from "@/components/Common";
import { UserBadge } from "@/components/Badges";
import { api, errMsg, validPesel } from "@/lib/api";
import { ROLE_NAMES } from "@/lib/labels";

export default function WorkersTab() {
  const [list, setList] = useState([]);
  const [f, setF] = useState({ pesel: "", first_name: "", last_name: "" });
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState(null);
  const load = useCallback(() => api.get("/gmina/workers").then((r) => setList(r.data)), []);
  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    if (!validPesel(f.pesel.trim())) return toast.error("Nieprawidłowy numer PESEL");
    setBusy(true);
    try {
      const { data } = await api.post("/gmina/workers", { ...f, pesel: f.pesel.trim() });
      setCode({ login: f.pesel.trim(), code: data.activation_code });
      setF({ pesel: "", first_name: "", last_name: "" });
      load();
    } catch (e2) { toast.error(errMsg(e2)); } finally { setBusy(false); }
  };
  const reset = async (w) => {
    try { const { data } = await api.post(`/gmina/workers/${w.id}/reset`); setCode({ login: "PESEL pracownika", code: data.activation_code }); } catch (e) { toast.error(errMsg(e)); }
  };
  const toggle = async (w) => {
    try { await api.patch(`/gmina/workers/${w.id}`, { status: w.status === "disabled" ? "active" : "disabled" }); load(); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <form onSubmit={add} className="space-y-3 rounded-2xl border border-emerald-100 bg-white p-5" data-testid="worker-form">
        <h3 className="font-semibold text-slate-800">Dodaj pracownika</h3>
        <p className="text-xs text-slate-500">Pracownik loguje się numerem PESEL. Po dodaniu otrzymasz kod aktywacyjny do przekazania.</p>
        <Input data-testid="worker-pesel-input" value={f.pesel} onChange={set("pesel")} placeholder="PESEL" inputMode="numeric" maxLength={11} className="h-12 rounded-xl font-mono-tag" required />
        <Input data-testid="worker-first-name-input" value={f.first_name} onChange={set("first_name")} placeholder="Imię" className="h-12 rounded-xl" required />
        <Input data-testid="worker-last-name-input" value={f.last_name} onChange={set("last_name")} placeholder="Nazwisko" className="h-12 rounded-xl" required />
        <Button data-testid="worker-submit-button" disabled={busy} className="h-12 w-full rounded-xl">{busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1 h-4 w-4" />}Dodaj</Button>
      </form>
      <div className="divide-y divide-emerald-50 overflow-hidden rounded-2xl border border-emerald-100 bg-white" data-testid="workers-list">
        {list.map((w) => (
          <div key={w.id} className="flex flex-wrap items-center gap-3 p-4" data-testid={`worker-row-${w.id}`}>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-800">{w.first_name} {w.last_name}</div>
              <div className="text-xs text-slate-500">{ROLE_NAMES[w.role]}{w.email ? ` · ${w.email}` : ""}</div>
            </div>
            <UserBadge value={w.status} testId={`worker-status-${w.id}`} />
            {w.role === "worker" && (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" data-testid={`worker-reset-${w.id}`} onClick={() => reset(w)} className="h-9 rounded-full"><KeyRound className="mr-1 h-3.5 w-3.5" />Nowy kod</Button>
                {w.status !== "invited" && <Button size="sm" variant="ghost" data-testid={`worker-toggle-${w.id}`} onClick={() => toggle(w)} className="h-9 rounded-full">{w.status === "disabled" ? "Włącz" : "Wyłącz"}</Button>}
              </div>
            )}
          </div>
        ))}
      </div>
      <CodeDialog info={code} onClose={() => setCode(null)} />
    </div>
  );
}
