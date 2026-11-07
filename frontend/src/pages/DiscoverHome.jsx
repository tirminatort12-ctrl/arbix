import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, ChevronRight, UserPlus } from "lucide-react";
import { GlobalSearch, NearbyParks, ParkCard } from "@/components/Discover";
import { SectionHead } from "@/components/Cards";
import { api } from "@/lib/api";
import { useGmina } from "@/lib/gmina";

export default function DiscoverHome() {
  const { gminas } = useGmina();
  const [popular, setPopular] = useState(null);
  useEffect(() => { api.get("/public/parks", { params: { limit: 12 } }).then((r) => setPopular(r.data)).catch(() => setPopular([])); }, []);

  return (
    <div className="space-y-10" data-testid="discover-home">
      <div className="rise relative z-20 space-y-5 pt-2">
        <div>
          <h1 className="text-[2rem] font-extrabold leading-[1.1] text-[#1B4332] sm:text-5xl">Odkrywaj parki<br />i zieleń w Polsce</h1>
          <p className="mt-2 text-[15px] text-slate-500">Mapy parków, pomniki przyrody i atrakcje w jednym miejscu.</p>
        </div>
        <GlobalSearch />
      </div>

      <section className="rise" style={{ animationDelay: "80ms" }}>
        <SectionHead sub="Blisko Ciebie" title="Parki w pobliżu" />
        <NearbyParks />
      </section>

      {popular?.length > 0 && (
        <section data-testid="popular-parks">
          <SectionHead sub="Najczęściej odwiedzane" title="Popularne parki" />
          <div className="grid gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">{popular.map((p) => <ParkCard key={p.id} p={p} big />)}</div>
        </section>
      )}

      {gminas.length > 0 && (
        <section data-testid="discover-gminas">
          <SectionHead sub="W ARBIX" title="Gminy" />
          <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white">
            {gminas.map((g) => (
              <Link key={g.id} to={`/gmina/${g.id}`} data-testid={`discover-gmina-${g.id}`} className="flex items-center gap-3 border-b border-emerald-50 px-4 py-3.5 last:border-0 hover:bg-emerald-50/40">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50"><Building2 className="h-5 w-5 text-[#2D6A4F]" /></span>
                <span className="flex-1 font-semibold text-slate-800">{g.name}</span><ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <Link to="/profil" data-testid="discover-join" className="flex items-center gap-4 rounded-3xl bg-emerald-50 p-5">
        <UserPlus className="h-7 w-7 shrink-0 text-[#2D6A4F]" />
        <span className="flex-1"><span className="block font-semibold text-[#1B4332]">Jesteś mieszkańcem gminy?</span><span className="block text-sm text-[#1B4332]/75">Załóż konto i zgłaszaj problemy z drzewami.</span></span>
        <ChevronRight className="h-5 w-5 text-[#2D6A4F]" />
      </Link>
    </div>
  );
}
