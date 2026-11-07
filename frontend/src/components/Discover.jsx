import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Building2, Landmark, LocateFixed, Loader2, MapPin, Search, TreeDeciduous, X } from "lucide-react";
import { api, imgOf } from "@/lib/api";
import { PLACE_CATS } from "@/lib/labels";

const PARK_IMGS = [
  "https://images.unsplash.com/photo-1632910991776-ab81989fa4da?crop=entropy&cs=srgb&fm=jpg&q=80&w=900",
  "https://images.unsplash.com/photo-1760289029369-cc48275b8d80?crop=entropy&cs=srgb&fm=jpg&q=80&w=900",
  "https://images.unsplash.com/photo-1686074403714-0b3484b48740?crop=entropy&cs=srgb&fm=jpg&q=80&w=900",
];
const hash = (s) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
export const parkImg = (p) => imgOf(p) || PARK_IMGS[hash(p.id) % PARK_IMGS.length];

const Hit = ({ to, icon: Icon, title, sub, testId }) => (
  <Link to={to} data-testid={testId} className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50/50">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50"><Icon className="h-5 w-5 text-[#2D6A4F]" /></span>
    <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-slate-900">{title}</span><span className="block truncate text-xs text-slate-500">{sub}</span></span>
  </Link>
);

const Group = ({ label, children }) => (
  <div><div className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>{children}</div>
);

export const GlobalSearch = ({ placeholder = "Szukaj gminy, parku lub atrakcji" }) => {
  const [q, setQ] = useState("");
  const [r, setR] = useState(null);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) return setR(null);
    const t = setTimeout(() => api.get("/public/search", { params: { q: s } }).then((x) => setR(x.data)).catch(() => setR(null)), 250);
    return () => clearTimeout(t);
  }, [q]);
  const empty = r && !r.gminas.length && !r.parks.length && !r.places.length && !r.monuments.length;
  return (
    <div className="relative" data-testid="global-search">
      <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#2D6A4F]" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} data-testid="global-search-input"
        className="h-14 w-full rounded-full border border-emerald-100 bg-white pl-14 pr-12 text-base shadow-[0_8px_30px_rgba(27,67,50,0.10)] outline-none transition-shadow focus:border-[#2D6A4F] focus:shadow-[0_8px_30px_rgba(27,67,50,0.18)]" />
      {q && <button type="button" onClick={() => setQ("")} aria-label="Wyczyść" data-testid="global-search-clear" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-5 w-5" /></button>}
      {r && (
        <div className="absolute inset-x-0 top-16 z-30 max-h-[60vh] overflow-y-auto rounded-3xl border border-emerald-100 bg-white pb-2 shadow-2xl" data-testid="global-search-results">
          {empty && <p className="p-5 text-sm text-slate-500">Nic nie znaleziono. Spróbuj innej nazwy.</p>}
          {r.gminas.length > 0 && <Group label="Gminy">{r.gminas.map((g) => <Hit key={g.id} to={`/gmina/${g.id}`} icon={Building2} title={g.name} sub="Gmina" testId={`search-gmina-${g.id}`} />)}</Group>}
          {r.parks.length > 0 && <Group label="Parki">{r.parks.map((p) => <Hit key={p.id} to={`/park/${p.id}`} icon={TreeDeciduous} title={p.name} sub={p.gmina_name} testId={`search-park-${p.id}`} />)}</Group>}
          {r.places.length > 0 && <Group label="Atrakcje">{r.places.map((p) => <Hit key={p.id} to={`/atrakcje/${p.id}`} icon={Landmark} title={p.name} sub={`${PLACE_CATS[p.category]} · ${p.gmina_name}`} testId={`search-place-${p.id}`} />)}</Group>}
          {r.monuments.length > 0 && <Group label="Pomniki przyrody">{r.monuments.map((t) => <Hit key={t.public_token} to={`/t/${t.public_token}`} icon={Award} title={t.monument_name || t.species} sub={t.gmina_name} testId={`search-monument-${t.public_token}`} />)}</Group>}
        </div>
      )}
    </div>
  );
};

export const ParkCard = ({ p, big = false }) => (
  <Link to={`/park/${p.id}`} data-testid={`park-card-${p.id}`} className={`group block shrink-0 snap-start active:scale-[0.98] ${big ? "w-full" : "w-64 sm:w-72"}`}>
    <div className={`relative overflow-hidden rounded-[24px] bg-emerald-50 ${big ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
      <img src={parkImg(p)} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      {p.distance_km != null && <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#1B4332]">{p.distance_km < 1 ? `${Math.round(p.distance_km * 1000)} m` : `${p.distance_km} km`}</span>}
    </div>
    <div className="px-1 pt-2.5">
      <div className="truncate font-semibold text-slate-900">{p.name}</div>
      <div className="flex items-center gap-1 truncate text-sm text-slate-500"><MapPin className="h-3.5 w-3.5 shrink-0" />{p.gmina_name}</div>
      <div className="mt-1 text-xs text-slate-500">{p.trees} drzew{p.monuments ? ` · ${p.monuments} pomn. przyrody` : ""}{p.places ? ` · ${p.places} atrakcji` : ""}</div>
    </div>
  </Link>
);

export const NearbyParks = () => {
  const [state, setState] = useState("idle");
  const [parks, setParks] = useState([]);
  const locate = () => {
    if (!navigator.geolocation) return setState("denied");
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => api.get("/public/parks", { params: { lat: pos.coords.latitude, lng: pos.coords.longitude, limit: 10 } }).then((r) => { setParks(r.data); setState("done"); }).catch(() => setState("denied")),
      () => setState("denied"), { timeout: 10000 });
  };
  useEffect(() => { navigator.permissions?.query({ name: "geolocation" }).then((p) => p.state === "granted" && locate()).catch(() => {}); }, []);

  if (state === "done") return parks.length ? (
    <div className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-1" data-testid="nearby-list">{parks.map((p) => <ParkCard key={p.id} p={p} />)}</div>
  ) : <p className="text-sm text-slate-500" data-testid="nearby-empty">W pobliżu nie ma jeszcze parków w ARBIX.</p>;
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-emerald-100 bg-white p-5" data-testid="nearby-prompt">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50"><LocateFixed className="h-6 w-6 text-[#2D6A4F]" /></span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-slate-900">Parki w Twojej okolicy</div>
        <div className="text-sm text-slate-500">{state === "denied" ? "Nie udało się ustalić lokalizacji. Sprawdź uprawnienia przeglądarki." : "Udostępnij lokalizację, aby je zobaczyć."}</div>
      </div>
      <button type="button" onClick={locate} disabled={state === "loading"} data-testid="nearby-locate-button" className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full bg-[#2D6A4F] px-4 text-sm font-semibold text-white">
        {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pokaż"}
      </button>
    </div>
  );
};
