import { useCallback, useEffect, useRef, useState } from "react";
import { Check, KeyRound, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CodeDialog } from "@/components/Common";
import { UserBadge } from "@/components/Badges";
import { api, errMsg, fmtDate } from "@/lib/api";

const FILTERS = [["pending", "Oczekujące"], ["active", "Aktywni"], ["rejected", "Odrzuceni"], ["", "Wszyscy"]];

export default function ResidentsTab({ onChanged }) {
  const [status, setStatus] = useState("pending");
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [replace, setReplace] = useState(false);
  const [result, setResult] = useState(null);
  const [code, setCode] = useState(null);
  const ref = useRef();
  const load = useCallback(() => api.get("/gmina/residents", { params: status ? { status } : {} }).then((r) => setList(r.data)), [status]);
  useEffect(() => { load(); }, [load]);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setBusy(true);
    try {
      const { data } = await api.post(`/gmina/pesel-list?replace=${replace}`, fd);
      setResult(data);
      toast.success(`Dodano ${data.added} numerów PESEL`);
      load();
      onChanged?.();
    } catch (e2) { toast.error(errMsg(e2)); } finally { setBusy(false); }
  };
  const setSt = async (r, st) => {
    try { await api.patch(`/gmina/residents/${r.id}`, { status: st }); toast.success(st === "active" ? "Zatwierdzono" : "Zaktualizowano"); load(); onChanged?.(); } catch (e) { toast.error(errMsg(e)); }
  };
  const reset = async (r) => {
    try { const { data } = await api.post(`/gmina/residents/${r.id}/reset`); setCode({ login: "PESEL mieszkańca", code: data.activation_code }); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-100 bg-white p-5">
        <h3 className="font-semibold text-slate-800">Lista PESEL mieszkańców</h3>
        <p className="mt-1 text-sm text-slate-500">Wgraj plik CSV lub XLSX z numerami PESEL (jedna kolumna). Mieszkańcy z listy są aktywowani automatycznie przy rejestracji. Numery są zapisywane wyłącznie w postaci zaszyfrowanej.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input ref={ref} type="file" accept=".csv,.txt,.xlsx" className="hidden" onChange={upload} data-testid="pesel-file-input" />
          <Button data-testid="gmina-admin-csv-upload-button" onClick={() => ref.current?.click()} disabled={busy} className="h-12 rounded-full px-6">{busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}Wgraj plik</Button>
          <label className="flex items-center gap-2 text-sm text-slate-600"><Checkbox data-testid="pesel-replace-checkbox" checked={replace} onCheckedChange={(v) => setReplace(!!v)} />Zastąp całą listę</label>
        </div>
        {result && (
          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-[#1B4332]" data-testid="pesel-upload-result">
            Dodano: <b>{result.added}</b> · już na liście: {result.already} · błędne: {result.invalid} · automatycznie zatwierdzono: {result.auto_activated} · łącznie na liście: <b>{result.total}</b>
          </p>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(([k, l]) => (
          <button key={l} data-testid={`residents-filter-${k || "all"}`} onClick={() => setStatus(k)}
            className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors ${status === k ? "border-[#2D6A4F] bg-[#2D6A4F] text-white" : "border-emerald-100 bg-white text-slate-600 hover:bg-emerald-50"}`}>{l}</button>
        ))}
      </div>
      <div className="divide-y divide-emerald-50 overflow-hidden rounded-2xl border border-emerald-100 bg-white" data-testid="residents-list">
        {list.length === 0 && <p className="p-6 text-center text-sm text-slate-500">Brak osób.</p>}
        {list.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 p-4" data-testid={`resident-row-${r.id}`}>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-800">{r.first_name} {r.last_name}</div>
              <div className="text-xs text-slate-500">{r.address} · {fmtDate(r.created_at)}</div>
            </div>
            <UserBadge value={r.status} testId={`resident-status-${r.id}`} />
            <div className="flex flex-wrap gap-1">
              {r.status !== "active" && <Button size="sm" data-testid={`resident-approve-${r.id}`} onClick={() => setSt(r, "active")} className="h-9 rounded-full"><Check className="mr-1 h-3.5 w-3.5" />Zatwierdź</Button>}
              {r.status === "pending" && <Button size="sm" variant="outline" data-testid={`resident-reject-${r.id}`} onClick={() => setSt(r, "rejected")} className="h-9 rounded-full"><X className="mr-1 h-3.5 w-3.5" />Odrzuć</Button>}
              {r.status === "active" && <Button size="sm" variant="outline" data-testid={`resident-reset-${r.id}`} onClick={() => reset(r)} className="h-9 rounded-full"><KeyRound className="mr-1 h-3.5 w-3.5" />Reset hasła</Button>}
            </div>
          </div>
        ))}
      </div>
      <CodeDialog info={code} onClose={() => setCode(null)} />
    </div>
  );
}
