import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Eye, Plus, TreeDeciduous, X } from "lucide-react";
import { Spinner, ServiceUnavailable, PhotoStrip } from "@/components/Common";
import Shell from "@/components/Shell";
import { ConditionBadge } from "@/components/Badges";
import { ReportCard } from "@/components/ReportCard";
import WorkLogForm from "@/components/WorkLogForm";
import { Button } from "@/components/ui/button";
import { api, errMsg, fileUrl, fmtDate } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { WORK_TYPES, CONDITIONS } from "@/lib/labels";

const Timeline = ({ logs }) => (
  <ol className="relative space-y-4 border-l-2 border-emerald-100 pl-5" data-testid="worker-history-timeline">
    {logs.length === 0 && <p className="text-sm text-slate-500">Brak wpisów w historii.</p>}
    {logs.map((l) => (
      <li key={l.id} className="rise relative" data-testid={`work-log-${l.id}`}>
        <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#2D6A4F]" />
        <div className="text-xs font-semibold text-slate-500">{fmtDate(l.date)} · {l.performer_name}</div>
        <div className="font-semibold text-slate-800">{WORK_TYPES[l.type]}{l.condition_after && <span className="ml-2 text-xs font-normal text-slate-500">→ {CONDITIONS[l.condition_after]?.label}</span>}</div>
        {l.description && <p className="mt-1 text-sm text-slate-700">{l.description}</p>}
        {(l.photos_before?.length > 0 || l.photos_after?.length > 0) && (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {l.photos_before?.length > 0 && <div><div className="mb-1 text-xs font-semibold text-slate-500">Przed</div><PhotoStrip paths={l.photos_before} /></div>}
            {l.photos_after?.length > 0 && <div><div className="mb-1 text-xs font-semibold text-slate-500">Po</div><PhotoStrip paths={l.photos_after} /></div>}
          </div>
        )}
      </li>
    ))}
  </ol>
);

export default function WorkerTree() {
  const { key } = useParams();
  const { user, gmina } = useAuth();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => api.get(`/staff/trees/${key}`).then((r) => setD(r.data)).catch((e) => setErr(errMsg(e))), [key]);
  useEffect(() => { if (["worker", "gmina_admin"].includes(user.role)) load(); }, [load, user.role]);

  if (!["worker", "gmina_admin"].includes(user.role)) return <Shell><p data-testid="worker-tree-forbidden" className="rounded-2xl bg-amber-50 p-6 text-amber-900">Karta służbowa jest dostępna tylko dla pracowników gminy.</p></Shell>;
  if (user.role === "worker" && gmina && !gmina.subscription.active) return <Shell><ServiceUnavailable /></Shell>;
  if (err) return <Shell><p data-testid="worker-tree-error" className="rounded-2xl bg-rose-50 p-6 text-rose-700">{err}</p></Shell>;
  if (!d) return <Shell><Spinner /></Shell>;
  const t = d.tree;

  return (
    <Shell>
      <div className="space-y-5" data-testid="worker-tree-service-card">
        <div className="flex items-center justify-between gap-3">
          <Link to="/app" data-testid="worker-back-link" className="inline-flex items-center gap-1 text-sm font-semibold text-[#2D6A4F]"><ArrowLeft className="h-4 w-4" />Panel</Link>
          {t.public_token && <Link to={`/t/${t.public_token}?widok=mieszkaniec`} data-testid="worker-resident-view-link" className="inline-flex items-center gap-1 rounded-full border border-emerald-200 px-3 py-1.5 text-sm font-semibold text-[#2D6A4F] hover:bg-emerald-50"><Eye className="h-4 w-4" />Widok mieszkańca</Link>}
        </div>
        <div className="rise flex gap-4 rounded-3xl border border-emerald-100 bg-white p-5">
          {t.photo_path ? <img src={fileUrl(t.photo_path)} alt="" className="h-24 w-24 shrink-0 rounded-2xl object-cover" /> : <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-emerald-50"><TreeDeciduous className="h-10 w-10 text-[#74C69D]" /></div>}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono-tag rounded-md bg-[#1B4332] px-2 py-0.5 text-xs text-white">SŁUŻBOWA · {t.tag_number}</span>
              <ConditionBadge value={t.condition} testId="worker-tree-condition" />
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-[#1B4332]" data-testid="worker-tree-species">{t.species}</h1>
            <p className="text-sm text-slate-500">{t.species_latin} · {t.park}</p>
            <p className="mt-1 text-xs text-slate-500">{t.location_desc} · posadzone {t.planted_year || "—"} · {t.circumference_cm ?? "—"} cm / {t.height_m ?? "—"} m</p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800">Zgłoszenia mieszkańców ({d.reports.filter((r) => ["new", "in_progress"].includes(r.status)).length} otwarte)</h2>
          {d.reports.length === 0 && <p className="text-sm text-slate-500">Brak zgłoszeń.</p>}
          {d.reports.map((r) => <ReportCard key={r.id} r={r} onChange={load} />)}
        </section>

        <section className="rounded-3xl border border-emerald-100 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Historia prac</h2>
            <Button data-testid="add-work-log-button" onClick={() => setAdding(!adding)} variant={adding ? "outline" : "default"} className="h-11 rounded-full">
              {adding ? <><X className="mr-1 h-4 w-4" />Anuluj</> : <><Plus className="mr-1 h-4 w-4" />Dodaj wpis</>}
            </Button>
          </div>
          {adding && <div className="mb-6 rounded-2xl bg-emerald-50/60 p-4"><WorkLogForm tree={t} reports={d.reports} onSaved={() => { setAdding(false); load(); }} /></div>}
          <Timeline logs={d.logs} />
        </section>
      </div>
    </Shell>
  );
}
