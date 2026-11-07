import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Search, TreeDeciduous } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/Common";
import { ConditionBadge } from "@/components/Badges";
import { api } from "@/lib/api";
import { CONDITIONS } from "@/lib/labels";

const TreeRows = ({ trees, nav, renderActions, load }) => {
  if (!trees) return <Spinner />;
  if (trees.length === 0) return (
        <p className="rounded-2xl border border-dashed border-emerald-200 bg-white p-6 text-center text-sm text-slate-500" data-testid="trees-empty">Brak drzew spełniających kryteria.</p>
  );
  return (
        <div className="divide-y divide-emerald-50 overflow-hidden rounded-2xl border border-emerald-100 bg-white" data-testid="gmina-admin-trees-table">
          {trees.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3 transition-colors hover:bg-emerald-50/50 sm:p-4" data-testid={`tree-row-${t.tag_number}`}>
              <button type="button" onClick={() => nav(`/staff/trees/${t.id}`)} data-testid={`tree-open-${t.tag_number}`} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50"><TreeDeciduous className="h-5 w-5 text-[#2D6A4F]" /></span>
                <span className="min-w-0">
                  <span className="font-mono-tag block text-xs text-slate-500">{t.tag_number}{t.open_reports > 0 && <span className="ml-2 rounded-full bg-blue-100 px-2 font-sans font-semibold text-blue-800">{t.open_reports} zgł.</span>}</span>
                  <span className="block truncate font-semibold text-slate-800">{t.species}</span>
                  <span className="block truncate text-xs text-slate-500">{t.park}{t.location_desc ? ` · ${t.location_desc}` : ""}</span>
                </span>
              </button>
              <ConditionBadge value={t.condition} testId={`tree-condition-${t.tag_number}`} />
              {renderActions ? renderActions(t, load) : <ChevronRight className="h-5 w-5 text-slate-300" />}
            </div>
          ))}
        </div>
  );
};

export default function TreeList({ renderActions, reloadKey = 0 }) {
  const [q, setQ] = useState("");
  const [park, setPark] = useState("all");
  const [cond, setCond] = useState("all");
  const [parks, setParks] = useState([]);
  const [trees, setTrees] = useState(null);
  const nav = useNavigate();

  useEffect(() => { api.get("/gmina/parks").then((r) => setParks(r.data)).catch(() => {}); }, [reloadKey]);
  const load = useCallback(() => {
    const params = { q };
    if (park !== "all") params.park_id = park;
    if (cond !== "all") params.condition = cond;
    api.get("/staff/trees", { params }).then((r) => setTrees(r.data)).catch(() => setTrees([]));
  }, [q, park, cond]);
  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load, reloadKey]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_200px_200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input data-testid="trees-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj: nr tabliczki, gatunek, miejsce" className="h-12 rounded-xl pl-9" />
        </div>
        <Select value={park} onValueChange={setPark}>
          <SelectTrigger data-testid="trees-park-filter" className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white"><SelectItem value="all">Wszystkie parki</SelectItem>{parks.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={cond} onValueChange={setCond}>
          <SelectTrigger data-testid="trees-condition-filter" className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white"><SelectItem value="all">Każdy stan</SelectItem>{Object.entries(CONDITIONS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <TreeRows trees={trees} nav={nav} renderActions={renderActions} load={load} />
    </div>
  );
}
