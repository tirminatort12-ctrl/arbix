import { Link } from "react-router-dom";
import { Award, ChevronDown, Droplets, Landmark, Leaf, Map as MapIcon, MapPin, Mountain, TreeDeciduous, UserPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { AttractionCard, NewsHero, NewsRow, SectionHead, toAttractions } from "@/components/Cards";
import { useGmina, useMapData, usePublicList } from "@/lib/gmina";

const HERO = "https://images.unsplash.com/photo-1760289029369-cc48275b8d80?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400";
const CHIPS = [["monument", "Pomniki przyrody", Award], ["fountain", "Fontanny", Droplets], ["heritage", "Zabytki", Landmark], ["viewpoint", "Widoki", Mountain], ["nature", "Przyroda", Leaf]];

const GminaPicker = ({ gid, gminas, choose, name }) => (gminas.length > 1 ? (
  <Select value={gid || ""} onValueChange={choose}>
    <SelectTrigger data-testid="home-gmina-select" className="h-auto w-auto gap-1 border-0 bg-transparent p-0 text-left shadow-none focus:ring-0 [&>svg:last-child]:hidden">
      <h1 className="text-3xl font-extrabold leading-tight text-[#1B4332]">{name}</h1><ChevronDown className="h-6 w-6 text-[#2D6A4F]" />
    </SelectTrigger>
    <SelectContent className="bg-white">{gminas.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
  </Select>
) : <h1 className="text-3xl font-extrabold leading-tight text-[#1B4332]" data-testid="home-gmina-name">{name}</h1>);

export default function TouristHome({ gidOverride }) {
  const { gid: g0, gminas, choose } = useGmina();
  const gid = gidOverride || g0;
  const gmina = gminas.find((g) => g.id === gid);
  const map = useMapData(gid);
  const places = usePublicList(gid, "places");
  const news = usePublicList(gid, "news", 4);
  const attractions = toAttractions(places || [], map?.trees || []);

  return (
    <div className="space-y-9" data-testid="tourist-home">
      <div className="rise">
        <p className="text-sm font-medium text-slate-500">Witaj w</p>
        <GminaPicker gid={gid} gminas={gidOverride ? [] : gminas} choose={choose} name={gmina?.name || "…"} />
      </div>

      <Link to="/mapa" data-testid="tourist-hero-map" className="rise group relative block overflow-hidden rounded-[28px] bg-[#1B4332]" style={{ animationDelay: "60ms" }}>
        <img src={HERO} alt="Park" className="aspect-[4/3] w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105 sm:aspect-[21/9]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f2a1f]/90 via-[#0f2a1f]/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
          <div className="text-2xl font-extrabold leading-tight sm:text-3xl">Odkryj zielone serce gminy</div>
          <div className="mt-1 text-sm text-white/80">{attractions.length} atrakcji · {map?.parks?.length || 0} parków · {map?.trees?.length || 0} drzew na mapie</div>
          <span className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#1B4332]"><MapIcon className="h-4 w-4" />Otwórz mapę</span>
        </div>
      </Link>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4" data-testid="tourist-chips">
        {CHIPS.map(([k, l, I]) => (
          <Link key={k} to={`/atrakcje?kat=${k}`} data-testid={`tourist-chip-${k}`} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-[#2D6A4F]">
            <I className="h-4 w-4 text-[#2D6A4F]" />{l}
          </Link>
        ))}
      </div>

      {attractions.length > 0 && (
        <section data-testid="tourist-attractions">
          <SectionHead sub="Warto zobaczyć" title="Atrakcje" to="/atrakcje" testId="tourist-attractions-all" />
          <div className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-1">{attractions.map((a) => <AttractionCard key={a.key} a={a} />)}</div>
        </section>
      )}

      {news?.length > 0 && (
        <section data-testid="tourist-news">
          <SectionHead sub="Co słychać" title="Aktualności z parków" to="/aktualnosci" testId="tourist-news-all" />
          <NewsHero n={news[0]} />
          <div className="mt-2 divide-y divide-emerald-50">{news.slice(1).map((n) => <NewsRow key={n.id} n={n} />)}</div>
        </section>
      )}

      {map?.parks?.length > 0 && (
        <section data-testid="tourist-parks">
          <SectionHead sub="Na spacer" title="Parki i skwery" />
          <div className="grid gap-3 sm:grid-cols-2">
            {map.parks.map((p) => (
              <Link key={p.id} to={`/park/${p.id}`} data-testid={`home-park-${p.id}`} className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-4 hover:border-emerald-200">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50"><TreeDeciduous className="h-5 w-5 text-[#2D6A4F]" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-slate-800">{p.name}</span>{p.description && <span className="block truncate text-xs text-slate-500">{p.description}</span>}</span>
                <MapPin className="h-4 w-4 text-slate-300" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grain relative overflow-hidden rounded-[28px] bg-[#1B4332] p-6 text-white" data-testid="tourist-join">
        <UserPlus className="h-8 w-8 text-[#B7E4C7]" />
        <h2 className="mt-3 text-xl font-bold">Mieszkasz w tej gminie?</h2>
        <p className="mt-1 text-sm leading-relaxed text-emerald-50/85">Załóż konto mieszkańca z numerem PESEL i zgłaszaj problemy z drzewami ze zdjęciem. Gmina zajmie się resztą.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/register" data-testid="home-register" className="inline-flex h-11 items-center rounded-full bg-white px-6 text-sm font-semibold text-[#1B4332]">Zarejestruj się</Link>
          <Link to="/login" data-testid="home-login" className="inline-flex h-11 items-center rounded-full border border-white/30 px-6 text-sm font-semibold text-white">Mam już konto</Link>
        </div>
      </section>
    </div>
  );
}
