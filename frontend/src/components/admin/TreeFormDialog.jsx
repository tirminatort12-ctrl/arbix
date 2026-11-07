import { useEffect, useState } from "react";
import { Loader2, LocateFixed } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/Common";
import { api, errMsg } from "@/lib/api";
import { CONDITIONS } from "@/lib/labels";

const EMPTY = { tag_number: "", species: "", species_latin: "", park_id: "", location_desc: "", lat: "", lng: "", planted_year: "", circumference_cm: "", height_m: "", condition: "good", description: "", history: "", is_monument: false, monument_name: "", monument_decision: "", monument_date: "", wiki_title: "" };
const NUM = ["lat", "lng", "planted_year", "circumference_cm", "height_m"];

export default function TreeFormDialog({ open, tree, parks, onClose, onSaved }) {
  const [f, setF] = useState(EMPTY);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setF(tree ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, tree[k] ?? ""])) : EMPTY);
      setPhoto(null);
    }
  }, [open, tree]);
  useEffect(() => {
    if (open && parks.length) setF((cur) => (cur.park_id ? cur : { ...cur, park_id: parks[0].id }));
  }, [open, parks]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const useLocation = () => {
    if (!navigator.geolocation) return toast.error("Lokalizacja niedostępna w tej przeglądarce");
    navigator.geolocation.getCurrentPosition(
      (p) => { setF((cur) => ({ ...cur, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })); toast.success("Pobrano współrzędne"); },
      () => toast.error("Nie udało się pobrać lokalizacji"), { enableHighAccuracy: true, timeout: 10000 });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!f.park_id) return toast.error("Najpierw dodaj park w zakładce Parki");
    const body = { ...f };
    NUM.forEach((k) => { body[k] = body[k] === "" ? null : Number(body[k]); });
    body.is_monument = !!f.is_monument;
    setBusy(true);
    try {
      const { data } = tree ? await api.put(`/gmina/trees/${tree.id}`, body) : await api.post("/gmina/trees", body);
      if (photo) {
        const fd = new FormData();
        fd.append("file", photo);
        await api.post(`/gmina/trees/${data.id}/photo`, fd);
      }
      toast.success(tree ? "Zapisano zmiany" : "Dodano drzewo");
      onSaved();
    } catch (e2) {
      toast.error(errMsg(e2));
    } finally {
      setBusy(false);
    }
  };

  const inp = (k, label, props = {}) => <Field label={label}><Input data-testid={`tree-form-${k}`} value={f[k]} onChange={set(k)} className="h-11 rounded-xl" {...props} /></Field>;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-white" data-testid="tree-form-dialog">
        <DialogHeader><DialogTitle className="font-display">{tree ? `Edytuj drzewo ${tree.tag_number}` : "Nowe drzewo"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {inp("tag_number", "Nr tabliczki", { required: true, placeholder: "ZP-0006" })}
          <Field label="Park">
            <Select value={f.park_id} onValueChange={(v) => setF({ ...f, park_id: v })}>
              <SelectTrigger data-testid="tree-form-park" className="h-11 rounded-xl"><SelectValue placeholder="Wybierz park" /></SelectTrigger>
              <SelectContent className="bg-white">{parks.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {inp("species", "Gatunek", { required: true, placeholder: "Dąb szypułkowy" })}
          {inp("species_latin", "Nazwa łacińska", { placeholder: "Quercus robur" })}
          <div className="sm:col-span-2">{inp("location_desc", "Opis lokalizacji")}</div>
          {inp("lat", "Szerokość geogr.", { type: "number", step: "any" })}
          {inp("lng", "Długość geogr.", { type: "number", step: "any" })}
          {inp("planted_year", "Rok posadzenia", { type: "number" })}
          {inp("circumference_cm", "Obwód (cm)", { type: "number", step: "any" })}
          {inp("height_m", "Wysokość (m)", { type: "number", step: "any" })}
          <Field label="Stan">
            <Select value={f.condition} onValueChange={(v) => setF({ ...f, condition: v })}>
              <SelectTrigger data-testid="tree-form-condition" className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">{Object.entries(CONDITIONS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2"><Field label="Opis dla mieszkańców"><Textarea data-testid="tree-form-description" value={f.description} onChange={set("description")} rows={3} className="rounded-xl" /></Field></div>
          <div className="sm:col-span-2"><Field label="Historia drzewa" hint="Skąd pochodzi, kto je posadził, ciekawostki i legendy — widoczne dla wszystkich."><Textarea data-testid="tree-form-history" value={f.history} onChange={set("history")} rows={4} className="rounded-xl" /></Field></div>
          <div className="space-y-3 rounded-2xl border border-amber-100 bg-amber-50/50 p-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Checkbox data-testid="tree-form-is-monument" checked={!!f.is_monument} onCheckedChange={(v) => setF({ ...f, is_monument: !!v })} />Pomnik przyrody
            </label>
            {f.is_monument && (
              <div className="grid gap-3 sm:grid-cols-3">
                {inp("monument_name", "Nazwa własna", { placeholder: "Dąb Bartek" })}
                {inp("monument_decision", "Akt prawny", { placeholder: "Uchwała nr …" })}
                {inp("monument_date", "Data ustanowienia", { type: "date" })}
              </div>
            )}
          </div>
          <div className="sm:col-span-2">{inp("wiki_title", "Artykuł w Wikipedii (opcjonalnie)", { placeholder: "Domyślnie wg nazwy łacińskiej, np. Quercus robur" })}</div>
          <div className="sm:col-span-2">
            <Button type="button" variant="outline" data-testid="tree-form-use-location" onClick={useLocation} className="h-11 rounded-xl"><LocateFixed className="mr-2 h-4 w-4" />Użyj mojej lokalizacji (współrzędne)</Button>
          </div>
          <div className="sm:col-span-2"><Field label="Zdjęcie drzewa" hint={tree?.photo_path ? "Drzewo ma już zdjęcie — wybierz nowe, aby je zastąpić." : ""}><Input data-testid="tree-form-photo" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} className="h-11 rounded-xl" /></Field></div>
          <Button data-testid="tree-form-submit" disabled={busy} className="h-12 rounded-xl sm:col-span-2">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{tree ? "Zapisz" : "Dodaj drzewo"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
