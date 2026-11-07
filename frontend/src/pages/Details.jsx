import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Calendar, Map as MapIcon, MapPin, Navigation } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Spinner } from "@/components/Common";
import { PLACEHOLDER, fmtNewsDate } from "@/components/Cards";
import { api, errMsg, imgOf } from "@/lib/api";
import { PLACE_CATS } from "@/lib/labels";

const useItem = (kind, id) => {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api.get(`/public/${kind}/${id}`).then((r) => setD(r.data)).catch((e) => setErr(errMsg(e))); }, [kind, id]);
  return [d, err];
};

const Layout = ({ title, d, err, testId, children }) => (
  <AppShell back title={title}>
    {err ? <p className="rounded-2xl bg-rose-50 p-6 text-rose-700" data-testid={`${testId}-error`}>{err}</p> : !d ? <Spinner /> : (
      <article className="space-y-5" data-testid={testId}>
        <img src={imgOf(d) || PLACEHOLDER} alt="" className="rise -mx-4 aspect-[4/3] w-[calc(100%+2rem)] max-w-none object-cover sm:mx-0 sm:w-full sm:rounded-[28px]" />
        {children}
      </article>
    )}
  </AppShell>
);

export function PlaceDetail() {
  const { id } = useParams();
  const [d, err] = useItem("places", id);
  return (
    <Layout title="Atrakcja" d={d} err={err} testId="place-detail">
      {d && (
        <>
          <div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#1B4332]" data-testid="place-category">{PLACE_CATS[d.category]}</span>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-[#1B4332]" data-testid="place-name">{d.name}</h1>
            {d.park && <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4" />{d.park}</p>}
          </div>
          {d.description && <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700" data-testid="place-description">{d.description}</p>}
          {d.lat != null && d.lng != null && (
            <div className="grid grid-cols-2 gap-3">
              <Link to={`/mapa?g=${d.gmina_id}&place=${d.id}`} data-testid="place-show-map" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#2D6A4F] text-sm font-semibold text-white"><MapIcon className="h-4 w-4" />Na mapie</Link>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lng}`} target="_blank" rel="noreferrer" data-testid="place-navigate" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-emerald-200 text-sm font-semibold text-[#1B4332]"><Navigation className="h-4 w-4" />Prowadź</a>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}

export function NewsDetail() {
  const { id } = useParams();
  const [d, err] = useItem("news", id);
  return (
    <Layout title="Aktualności" d={d} err={err} testId="news-detail">
      {d && (
        <>
          <div>
            <p className="flex items-center gap-1 text-sm text-slate-500"><Calendar className="h-4 w-4" />{fmtNewsDate(d.created_at)}{d.park ? ` · ${d.park}` : ""}</p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight text-[#1B4332]" data-testid="news-title">{d.title}</h1>
          </div>
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700" data-testid="news-body">{d.body}</p>
        </>
      )}
    </Layout>
  );
}
