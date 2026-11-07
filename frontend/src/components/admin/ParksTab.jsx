import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Trees } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, errMsg } from "@/lib/api";

export default function ParksTab() {
  const [parks, setParks] = useState([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.get("/gmina/parks").then((r) => setParks(r.data)), []);
  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api.post("/gmina/parks", { name, description: desc }); setName(""); setDesc(""); toast.success("Dodano park"); load(); }
    catch (e2) { toast.error(errMsg(e2)); } finally { setBusy(false); }
  };
  const remove = async (p) => {
    try { await api.delete(`/gmina/parks/${p.id}`); toast.success("Usunięto park"); load(); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <form onSubmit={add} className="space-y-3 rounded-2xl border border-emerald-100 bg-white p-5" data-testid="park-form">
        <h3 className="font-semibold text-slate-800">Nowy park / skwer</h3>
        <Input data-testid="park-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nazwa" className="h-12 rounded-xl" required />
        <Input data-testid="park-description-input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Opis (opcjonalnie)" className="h-12 rounded-xl" />
        <Button data-testid="park-submit-button" disabled={busy} className="h-12 w-full rounded-xl">{busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}Dodaj park</Button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2" data-testid="parks-list">
        {parks.map((p) => (
          <div key={p.id} className="rise flex items-start justify-between rounded-2xl border border-emerald-100 bg-white p-5" data-testid={`park-card-${p.id}`}>
            <div>
              <Trees className="h-5 w-5 text-[#2D6A4F]" />
              <div className="mt-2 font-semibold text-slate-800">{p.name}</div>
              {p.description && <div className="text-sm text-slate-500">{p.description}</div>}
              <div className="mt-1 text-xs font-semibold text-slate-500">{p.tree_count} drzew</div>
            </div>
            <button data-testid={`park-delete-${p.id}`} onClick={() => remove(p)} aria-label="Usuń" className="grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
