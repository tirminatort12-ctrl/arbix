import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, RefreshCw, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Spinner } from "@/components/Common";
import { api, errMsg } from "@/lib/api";

const lines = (v) => v.split("\n").map((x) => x.trim()).filter(Boolean);
const toForm = (c = {}) => ({ summary: c.summary || "", birds: (c.birds || []).join("\n"), insects: (c.insects || []).join("\n"), facts: (c.facts || []).join("\n"), season: c.season || "" });

const EditDialog = ({ item, onClose, onSaved }) => {
  const [f, setF] = useState(toForm(item?.content));
  const [busy, setBusy] = useState(false);
  useEffect(() => setF(toForm(item?.content)), [item]);
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/gmina/species/${encodeURIComponent(item.key)}`, { species: item.species, content: { title: item.species, summary: f.summary, birds: lines(f.birds), insects: lines(f.insects), facts: lines(f.facts), season: f.season } });
      toast.success("Zapisano opis gatunku");
      onSaved();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-lg" data-testid="species-edit-dialog">
        <DialogHeader><DialogTitle>{item?.species}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Opis"><Textarea rows={4} value={f.summary} onChange={on("summary")} data-testid="species-form-summary" /></Field>
          <Field label="Ptaki (jeden w linii)"><Textarea rows={3} value={f.birds} onChange={on("birds")} data-testid="species-form-birds" /></Field>
          <Field label="Owady i inne zwierzęta (jeden w linii)"><Textarea rows={3} value={f.insects} onChange={on("insects")} data-testid="species-form-insects" /></Field>
          <Field label="Ciekawostki (jedna w linii)"><Textarea rows={4} value={f.facts} onChange={on("facts")} data-testid="species-form-facts" /></Field>
          <Field label="W ciągu roku"><Input value={f.season} onChange={on("season")} data-testid="species-form-season" className="h-12 rounded-xl" /></Field>
          <Button onClick={save} disabled={busy || !f.summary.trim()} data-testid="species-form-save" className="h-12 w-full rounded-full bg-[#2D6A4F] hover:bg-[#1B4332]">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Zapisz"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ s, onEdit, onReset, onRegen }) => (
  <div className="rounded-2xl border border-emerald-100 bg-white p-4" data-testid={`species-row-${s.key}`}>
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-slate-900">{s.species} <span className="font-normal italic text-slate-500">{s.latin}</span></div>
        <div className="text-xs text-slate-500">{s.count} drzew · {s.source === "gmina" ? "Opis gminy" : s.status === "ready" ? "Opis przygotowany przez AI" : "Brak opisu — powstanie po pierwszym wyświetleniu"}</div>
      </div>
      <Button variant="outline" size="sm" onClick={() => onEdit(s)} data-testid={`species-edit-${s.key}`} className="rounded-full"><Pencil className="mr-1 h-3.5 w-3.5" />Edytuj</Button>
    </div>
    {s.content?.summary && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{s.content.summary}</p>}
    <div className="mt-2 flex gap-3 text-xs font-semibold">
      {s.source === "gmina" && <button type="button" onClick={() => onReset(s)} data-testid={`species-reset-${s.key}`} className="inline-flex items-center gap-1 text-slate-500"><RotateCcw className="h-3.5 w-3.5" />Przywróć opis AI</button>}
      {s.source !== "gmina" && <button type="button" onClick={() => onRegen(s)} data-testid={`species-regen-${s.key}`} className="inline-flex items-center gap-1 text-[#2D6A4F]"><RefreshCw className="h-3.5 w-3.5" />{s.status === "ready" ? "Napisz od nowa (AI)" : "Przygotuj opis (AI)"}</button>}
    </div>
  </div>
);

export default function SpeciesTab() {
  const [list, setList] = useState(null);
  const [edit, setEdit] = useState(null);
  const load = useCallback(() => api.get("/gmina/species").then((r) => setList(r.data)).catch((e) => toast.error(errMsg(e))), []);
  useEffect(() => { load(); }, [load]);
  const reset = async (s) => { await api.delete(`/gmina/species/${encodeURIComponent(s.key)}`); load(); };
  const regen = async (s) => {
    try { await api.post(`/gmina/species/${encodeURIComponent(s.key)}/regenerate`); toast.success("AI przygotowuje opis — odśwież za chwilę"); setTimeout(load, 15000); } catch (e) { toast.error(errMsg(e)); }
  };
  if (!list) return <Spinner />;
  return (
    <div className="space-y-4" data-testid="species-tab">
      <p className="flex gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-[#1B4332]"><Sparkles className="h-4 w-4 shrink-0" />Turyści widzą przy drzewie ciekawostki o gatunku: jakie ptaki i owady na nim żyją, kiedy kwitnie. Opis przygotowuje AI, a Ty możesz go poprawić.</p>
      {list.length === 0 ? <p className="text-sm text-slate-500">Dodaj drzewa, aby zobaczyć gatunki.</p> : list.map((s) => <Row key={s.key} s={s} onEdit={setEdit} onReset={reset} onRegen={regen} />)}
      <EditDialog item={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />
    </div>
  );
}
