import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Compass, MapPin } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Spinner } from "@/components/Common";
import { AttractionCard, toAttractions } from "@/components/Cards";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { useGmina, useMapData, usePublicList } from "@/lib/gmina";
import { PLACE_CATS } from "@/lib/labels";
import { useT } from "@/lib/i18n";

const FILTERS = [["all", "Wszystko"], ["monument", "Pomniki przyrody"], ...Object.entries(PLACE_CATS)];

const GminaRow = ({ gid, gminas, choose, gmina }) => (
  <div className="flex items-center gap-3 rounded-3xl border border-emerald-100 bg-white px-4 py-3" data-testid="attractions-gmina">
    <MapPin className="h-5 w-5 shrink-0 text-[#2D6A4F]" />
    <span className="min-w-0 flex-1 truncate font-semibold text-slate-900" data-testid="attractions-gmina-name">{gmina?.name || "…"}</span>
    {gminas.length > 1 && (
      <Select value={gid || ""} onValueChange={choose}>
        <SelectTrigger data-testid="attractions-gmina-change" className="h-auto w-auto border-0 bg-transparent p-0 font-semibold text-[#2D6A4F] shadow-none focus:ring-0 [&>svg]:hidden">Zmień</SelectTrigger>
        <SelectContent className="bg-white">{gminas.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
      </Select>
    )}
  </div>
);

export default function Attractions() {
  const { t } = useT();
  const [sp, setSp] = useSearchParams();
  const kat = sp.get("kat") || "all";
  const { gid, gminas, choose, gmina } = useGmina();
  const map = useMapData(gid);
  const places = usePublicList(gid, "places");
  const all = useMemo(() => toAttractions(places || [], map?.trees || []), [places, map]);
  const present = useMemo(() => new Set(all.map((a) => a.cat)), [all]);
  const list = useMemo(() => all.filter((a) => kat === "all" || a.cat === kat), [all, kat]);
  const filters = useMemo(() => FILTERS.filter(([k]) => k === "all" || present.has(k)), [present]);

  return (
    <AppShell title={t("attractions")} wide>
      <div className="space-y-5" data-testid="attractions-page">
        <h1 className="text-2xl font-extrabold text-[#1B4332]">Co warto zobaczyć</h1>
        <GminaRow gid={gid} gminas={gminas} choose={choose} gmina={gmina} />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
          {filters.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setSp(k === "all" ? {} : { kat: k })} data-testid={`attractions-filter-${k}`}
              className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors ${kat === k ? "bg-[#1B4332] text-white" : "border border-emerald-100 bg-white text-slate-700"}`}>{l}</button>
          ))}
        </div>
        {!places || !map ? <Spinner /> : list.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-emerald-200 bg-white p-8 text-center text-sm text-slate-500" data-testid="attractions-empty">Brak atrakcji w tej kategorii.</p>
        ) : (
          <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="attractions-list">{list.map((a) => <AttractionCard key={a.key} a={a} wide />)}</div>
        )}
        <Link to="/odkrywaj" data-testid="attractions-discover-link" className="flex items-center gap-3 rounded-3xl bg-emerald-50 p-5 font-semibold text-[#1B4332]">
          <Compass className="h-6 w-6 text-[#2D6A4F]" />Odkrywaj parki w całej Polsce
        </Link>
      </div>
    </AppShell>
  );
}
