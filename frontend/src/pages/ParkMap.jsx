import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Award, TreeDeciduous } from "lucide-react";
import AppShell from "@/components/AppShell";
import TreeMap from "@/components/TreeMap";
import { Spinner } from "@/components/Common";
import { ConditionBadge } from "@/components/Badges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fileUrl } from "@/lib/api";
import { useGmina, useMapData, usePublicList } from "@/lib/gmina";

const Chip = ({ active, onClick, children, testId }) => (
  <button type="button" onClick={onClick} data-testid={testId}
    className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors ${active ? "border-[#2D6A4F] bg-[#2D6A4F] text-white" : "border-emerald-100 bg-white text-slate-600 hover:bg-emerald-50"}`}>{children}</button>
);

const TreeItem = ({ t, parkName }) => (
  <Link to={`/t/${t.public_token}`} data-testid={`map-list-tree-${t.tag_number}`} className="rise flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-3 transition-colors hover:bg-emerald-50/50">
    {t.photo_path ? <img src={fileUrl(t.photo_path)} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" /> : (
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl ${t.is_monument ? "bg-amber-50" : "bg-emerald-50"}`}>
        {t.is_monument ? <Award className="h-6 w-6 text-amber-600" /> : <TreeDeciduous className="h-6 w-6 text-[#2D6A4F]" />}
      </span>
    )}
    <span className="min-w-0 flex-1">
      <span className="block truncate font-semibold text-slate-800">{(t.is_monument && t.monument_name) || t.species}</span>
      <span className="block truncate text-xs text-slate-500">{t.is_monument && t.monument_name ? `${t.species} · ` : ""}{parkName}</span>
    </span>
    {t.condition && <ConditionBadge value={t.condition} testId={`map-list-condition-${t.tag_number}`} />}
  </Link>
);

export default function ParkMap() {
  const [sp, setSp] = useSearchParams();
  const { gid: defGid, gminas, choose } = useGmina();
  const [park, setPark] = useState(sp.get("park") || "all");
  const onlyMon = sp.get("pomniki") === "1";
  const setOnlyMon = (v) => { const n = new URLSearchParams(sp); if (v) n.set("pomniki", "1"); else n.delete("pomniki"); setSp(n); };
  const gid = sp.get("g") || defGid;
  const data = useMapData(gid);
  const allPlaces = usePublicList(gid, "places");
  const places = onlyMon ? [] : (allPlaces || []).filter((p) => park === "all" || p.park_id === park);

  const parks = useMemo(() => Object.fromEntries((data?.parks || []).map((p) => [p.id, p.name])), [data]);
  const trees = (data?.trees || []).filter((t) => (park === "all" || t.park_id === park) && (!onlyMon || t.is_monument));
  const monuments = (data?.trees || []).filter((t) => t.is_monument);

  return (
    <AppShell title="Mapa" wide>
      <div className="space-y-5" data-testid="park-map-page">
        <div className="rise flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-2xl font-extrabold text-[#1B4332]">Drzewa i atrakcje</h1>
          {gminas.length > 1 && (
            <Select value={gid || ""} onValueChange={(v) => { setPark("all"); choose(v); setSp({ g: v }); }}>
              <SelectTrigger data-testid="map-gmina-select" className="h-12 w-full rounded-xl sm:w-72"><SelectValue placeholder="Wybierz gminę" /></SelectTrigger>
              <SelectContent className="bg-white">{gminas.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
        {!data ? <Spinner /> : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Chip active={onlyMon} onClick={() => setOnlyMon(!onlyMon)} testId="map-only-monuments"><Award className="mr-1 inline h-4 w-4" />Tylko pomniki przyrody</Chip>
              <Chip active={park === "all"} onClick={() => setPark("all")} testId="map-park-all">Wszystkie parki</Chip>
              {data.parks.map((p) => <Chip key={p.id} active={park === p.id} onClick={() => setPark(p.id)} testId={`map-park-${p.id}`}>{p.name}</Chip>)}
            </div>
            <TreeMap trees={trees} places={places} focusToken={sp.get("tree")} focusPlace={sp.get("place")} />
            <div className="flex flex-wrap gap-4 text-xs text-slate-600" data-testid="map-legend">
              {[["#2D6A4F", "Dobry stan"], ["#D97706", "Wymaga uwagi"], ["#E11D48", "Stan zagrożenia"]].map(([c, l]) => <span key={l} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: c }} />{l}</span>)}
              <span className="flex items-center gap-1.5"><span className="text-amber-500">★</span>Pomnik przyrody</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-[#0369A1]" />Atrakcja</span>
              {trees.length > trees.filter((t) => t.lat != null).length && <span className="text-slate-400">Część drzew nie ma jeszcze współrzędnych.</span>}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="min-w-0">
                <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-slate-800"><Award className="h-5 w-5 text-amber-600" />Pomniki przyrody ({monuments.length})</h2>
                <div className="space-y-2" data-testid="monuments-list">
                  {monuments.length === 0 ? <p className="text-sm text-slate-500">Brak pomników przyrody w tej gminie.</p> : monuments.map((t) => <TreeItem key={t.public_token} t={t} parkName={parks[t.park_id]} />)}
                </div>
              </section>
              <section className="min-w-0">
                <h2 className="mb-3 text-xl font-bold text-slate-800">Drzewa na mapie ({trees.length})</h2>
                <div className="space-y-2" data-testid="map-trees-list">{trees.map((t) => <TreeItem key={t.public_token} t={t} parkName={parks[t.park_id]} />)}</div>
              </section>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
