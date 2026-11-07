import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Award, Building2, Landmark, Map as MapIcon, Navigation, TreeDeciduous } from "lucide-react";
import AppShell from "@/components/AppShell";
import TouristHome from "@/pages/TouristHome";
import { Spinner } from "@/components/Common";
import { AttractionCard, NewsRow, SectionHead, toAttractions } from "@/components/Cards";
import { parkImg } from "@/components/Discover";
import { api, errMsg } from "@/lib/api";
import { useGmina } from "@/lib/gmina";

const Stat = ({ icon: Icon, value, label }) => (
  <div className="rounded-2xl bg-white p-3 text-center">
    <Icon className="mx-auto h-5 w-5 text-[#2D6A4F]" />
    <div className="mt-1 text-lg font-bold text-slate-900">{value}</div>
    <div className="text-[11px] text-slate-500">{label}</div>
  </div>
);

export function ParkPage() {
  const { id } = useParams();
  const { choose } = useGmina();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api.get(`/public/parks/${id}`).then((r) => { setD(r.data); choose(r.data.park.gmina_id); }).catch((e) => setErr(errMsg(e))); }, [id, choose]);
  const p = d?.park;
  const attractions = d ? toAttractions(d.places.map((x) => ({ ...x, park: "" })), d.monuments) : [];
  return (
    <AppShell back title="Park">
      {err ? <p className="rounded-2xl bg-rose-50 p-6 text-rose-700" data-testid="park-page-error">{err}</p> : !d ? <Spinner /> : (
        <article className="space-y-7" data-testid="park-page">
          <div className="rise relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-[28px]">
            <img src={parkImg(p)} alt={p.name} className="aspect-[4/3] w-full object-cover sm:aspect-[21/9]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f2a1f]/85 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <Link to={`/gmina/${p.gmina_id}`} data-testid="park-gmina-link" className="inline-flex items-center gap-1 text-sm font-semibold text-white/85"><Building2 className="h-4 w-4" />{p.gmina_name}</Link>
              <h1 className="mt-1 text-3xl font-extrabold leading-tight" data-testid="park-name">{p.name}</h1>
            </div>
          </div>
          {p.description && <p className="text-[15px] leading-relaxed text-slate-700">{p.description}</p>}
          <div className="grid grid-cols-3 gap-2 rounded-3xl bg-emerald-50 p-2">
            <Stat icon={TreeDeciduous} value={p.trees} label="drzew" />
            <Stat icon={Award} value={p.monuments} label="pomn. przyrody" />
            <Stat icon={Landmark} value={p.places} label="atrakcji" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link to={`/mapa?g=${p.gmina_id}&park=${p.id}`} data-testid="park-open-map" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#2D6A4F] text-sm font-semibold text-white"><MapIcon className="h-4 w-4" />Mapa parku</Link>
            {p.lat != null ? (
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`} target="_blank" rel="noreferrer" data-testid="park-navigate" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-emerald-200 text-sm font-semibold text-[#1B4332]"><Navigation className="h-4 w-4" />Prowadź</a>
            ) : <span />}
          </div>
          {attractions.length > 0 && (
            <section data-testid="park-attractions">
              <SectionHead title="Atrakcje w parku" />
              <div className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-1">{attractions.map((a) => <AttractionCard key={a.key} a={a} />)}</div>
            </section>
          )}
          {d.news.length > 0 && (
            <section data-testid="park-news">
              <SectionHead title="Aktualności" />
              <div className="divide-y divide-emerald-50 rounded-3xl border border-emerald-100 bg-white px-4">{d.news.map((n) => <NewsRow key={n.id} n={n} />)}</div>
            </section>
          )}
        </article>
      )}
    </AppShell>
  );
}

export function GminaPage() {
  const { gid } = useParams();
  const { choose } = useGmina();
  const [ready, setReady] = useState(false);
  useEffect(() => { choose(gid); setReady(true); }, [gid, choose]);
  return <AppShell back title="Gmina">{ready && <TouristHome gidOverride={gid} />}</AppShell>;
}
