import { useCallback, useEffect, useState } from "react";
import { ImagePlus, LocateFixed, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/Common";
import { api, errMsg, imgOf } from "@/lib/api";
import { PLACE_CATS } from "@/lib/labels";

const CFG = {
  places: { one: "atrakcję", add: "Dodaj atrakcję", empty: { name: "", category: "other", description: "", park_id: "none", lat: "", lng: "" } },
  news: { one: "aktualność", add: "Dodaj aktualność", empty: { title: "", body: "", park_id: "none" } },
};

const toBody = (kind, f) => {
  const b = { ...f, park_id: f.park_id === "none" ? null : f.park_id };
  if (kind === "places") {
    const num = (v) => (String(v).trim() === "" ? null : Number(String(v).replace(",", ".")));
    b.lat = num(f.lat); b.lng = num(f.lng);
    if (Number.isNaN(b.lat) || Number.isNaN(b.lng)) throw new Error("coords");
  }
  return b;
};

const Form = ({ kind, f, set, parks }) => {
  const on = (k) => (e) => set({ ...f, [k]: e.target.value });
  const locate = () => navigator.geolocation?.getCurrentPosition((p) => set({ ...f, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) }), () => toast.error("Brak dostępu do lokalizacji"));
  const park = (
    <Field label="Park">
      <Select value={f.park_id} onValueChange={(v) => set({ ...f, park_id: v })}>
        <SelectTrigger data-testid={`${kind}-form-park`} className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-white"><SelectItem value="none">Cała gmina</SelectItem>{parks.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
      </Select>
    </Field>
  );
  if (kind === "news") return (
    <>
      <Field label="Tytuł"><Input data-testid="news-form-title" value={f.title} onChange={on("title")} className="h-12 rounded-xl" required /></Field>
      {park}
      <Field label="Treść"><Textarea data-testid="news-form-body" value={f.body} onChange={on("body")} rows={6} className="rounded-xl" required /></Field>
    </>
  );
  return (
    <>
      <Field label="Nazwa"><Input data-testid="places-form-name" value={f.name} onChange={on("name")} className="h-12 rounded-xl" required /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kategoria">
          <Select value={f.category} onValueChange={(v) => set({ ...f, category: v })}>
            <SelectTrigger data-testid="places-form-category" className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white">{Object.entries(PLACE_CATS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        {park}
      </div>
      <Field label="Opis"><Textarea data-testid="places-form-description" value={f.description} onChange={on("description")} rows={4} className="rounded-xl" /></Field>
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <Field label="Szer. geogr."><Input data-testid="places-form-lat" value={f.lat} onChange={on("lat")} inputMode="decimal" className="h-12 rounded-xl" /></Field>
        <Field label="Dł. geogr."><Input data-testid="places-form-lng" value={f.lng} onChange={on("lng")} inputMode="decimal" className="h-12 rounded-xl" /></Field>
        <Button type="button" variant="outline" onClick={locate} data-testid="places-form-locate" className="h-12 rounded-xl" aria-label="Moja lokalizacja"><LocateFixed className="h-4 w-4" /></Button>
      </div>
    </>
  );
};

const EditDialog = ({ kind, item, parks, onClose, onSaved }) => {
  const [f, set] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!item) return;
    const e = CFG[kind].empty;
    set(item === "new" ? e : Object.fromEntries(Object.keys(e).map((k) => [k, item[k] ?? (k === "park_id" ? "none" : "")])));
    setFile(null);
  }, [item, kind]);
  const save = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    try {
      const body = toBody(kind, f);
      const { data } = item === "new" ? await api.post(`/gmina/${kind}`, body) : await api.put(`/gmina/${kind}/${item.id}`, body);
      if (file) { const fd = new FormData(); fd.append("file", file); await api.post(`/gmina/${kind}/${data.id}/photo`, fd); }
      toast.success("Zapisano");
      onSaved();
    } catch (e) { toast.error(e.message === "coords" ? "Nieprawidłowe współrzędne" : errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-xl">
        <DialogHeader><DialogTitle>{item === "new" ? CFG[kind].add : `Edytuj ${CFG[kind].one}`}</DialogTitle></DialogHeader>
        {f && (
          <form onSubmit={save} className="space-y-4" data-testid={`${kind}-form`}>
            <Form kind={kind} f={f} set={set} parks={parks} />
            <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 text-sm font-semibold text-[#2D6A4F]">
              <ImagePlus className="h-4 w-4" />{file ? file.name : "Zdjęcie (opcjonalnie)"}
              <input type="file" accept="image/*" hidden data-testid={`${kind}-form-photo`} onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <Button type="submit" disabled={busy} data-testid={`${kind}-form-submit`} className="h-12 w-full rounded-xl">{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Zapisz</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default function ContentTab({ kind }) {
  const [items, setItems] = useState([]);
  const [parks, setParks] = useState([]);
  const [edit, setEdit] = useState(null);
  const load = useCallback(() => api.get(`/gmina/${kind}`).then((r) => setItems(r.data)), [kind]);
  useEffect(() => { load(); api.get("/gmina/parks").then((r) => setParks(r.data)); }, [load]);
  const remove = async (i) => {
    if (!window.confirm("Usunąć?")) return;
    try { await api.delete(`/gmina/${kind}/${i.id}`); toast.success("Usunięto"); load(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="space-y-4" data-testid={`${kind}-tab`}>
      <Button onClick={() => setEdit("new")} data-testid={`${kind}-add-button`} className="h-11 rounded-full"><Plus className="mr-1 h-4 w-4" />{CFG[kind].add}</Button>
      {items.length === 0 && <p className="text-sm text-slate-500">Brak wpisów.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((i) => (
          <div key={i.id} className="flex gap-4 rounded-2xl border border-emerald-100 bg-white p-3" data-testid={`${kind}-item-${i.id}`}>
            {imgOf(i) ? <img src={imgOf(i)} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" /> : <div className="h-20 w-20 shrink-0 rounded-xl bg-emerald-50" />}
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-slate-800">{i.name || i.title}</div>
              <div className="text-xs text-slate-500">{kind === "places" ? PLACE_CATS[i.category] : new Date(i.created_at).toLocaleDateString("pl-PL")}{i.park ? ` · ${i.park}` : ""}</div>
              <div className="mt-1 line-clamp-2 text-sm text-slate-600">{i.description || i.body}</div>
            </div>
            <div className="flex flex-col gap-1">
              <button type="button" onClick={() => setEdit(i)} data-testid={`${kind}-edit-${i.id}`} aria-label="Edytuj" className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-emerald-50"><Pencil className="h-4 w-4" /></button>
              <button type="button" onClick={() => remove(i)} data-testid={`${kind}-delete-${i.id}`} aria-label="Usuń" className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <EditDialog kind={kind} item={edit} parks={parks} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />
    </div>
  );
}
