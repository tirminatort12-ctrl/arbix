import { useEffect, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { Award, Calendar, Map as MapIcon, MapPin, Ruler, ScrollText, TreeDeciduous, Wrench, ClipboardList } from "lucide-react";
import WikiCard from "@/components/WikiCard";
import { SpeciesInfo } from "@/components/SpeciesInfo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import AppShell from "@/components/AppShell";
import { Spinner, ServiceUnavailable } from "@/components/Common";
import { ConditionBadge } from "@/components/Badges";
import ReportForm from "@/components/ReportForm";
import { api, errMsg, fileUrl, fmtDate } from "@/lib/api";
import { WORK_TYPES } from "@/lib/labels";
import { useT } from "@/lib/i18n";

const Fact = ({ icon: Icon, label, value, testId }) => (
  <div className="rounded-2xl border border-emerald-100 bg-white p-4" data-testid={testId}>
    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"><Icon className="h-3.5 w-3.5" />{label}</div>
    <div className="mt-1 font-semibold text-slate-800">{value}</div>
  </div>
);

const BLOCK = {
  pending: "Twoje konto czeka na zatwierdzenie przez gminę. Po zatwierdzeniu będziesz mógł wysyłać zgłoszenia.",
  other_gmina: "To drzewo należy do innej gminy. Zgłoszenia możesz wysyłać tylko w swojej gminie.",
  not_resident: "Zgłoszenia wysyłają mieszkańcy tej gminy.",
  inactive: "Zgłoszenia są chwilowo niedostępne.",
};

export default function PublicTree() {
  const { token } = useParams();
  const [sp] = useSearchParams();
  const [t, setT] = useState(null);
  const [err, setErr] = useState("");
  const [factsOpen, setFactsOpen] = useState(false);
  const { t: tr } = useT();

  useEffect(() => { api.get(`/public/trees/${token}`).then((r) => setT(r.data)).catch((e) => setErr(errMsg(e))); }, [token]);

  if (err) return <AppShell back title="Drzewo"><p data-testid="public-tree-error" className="rounded-2xl bg-rose-50 p-6 text-rose-700">{err}</p></AppShell>;
  if (!t) return <AppShell back title="Drzewo"><Spinner /></AppShell>;
  if (t.is_staff && sp.get("widok") !== "mieszkaniec") return <Navigate to={`/staff/trees/${t.staff_tree_id}`} replace />;
  const age = t.planted_year ? new Date().getFullYear() - t.planted_year : null;

  return (
    <AppShell back title={t.tag_number}>
      <article data-testid="tree-public-passport-view" className="space-y-5">
        <div className="rise overflow-hidden rounded-3xl border border-emerald-100 bg-white">
          {t.photo_path ? (
            <img src={fileUrl(t.photo_path)} alt={t.species} className="h-64 w-full object-cover sm:h-80" data-testid="public-tree-photo" />
          ) : (
            <div className="grain grid h-40 place-items-center bg-emerald-50"><TreeDeciduous className="h-16 w-16 text-[#74C69D]" /></div>
          )}
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono-tag rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600" data-testid="public-tree-tag">Nr {t.tag_number}</span>
              {t.condition && <ConditionBadge value={t.condition} testId="public-tree-condition" />}
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-[#1B4332] sm:text-4xl" data-testid="public-tree-species">{(t.is_monument && t.monument_name) || t.species}</h1>
            {t.is_monument && t.monument_name && <p className="font-semibold text-slate-700">{t.species}</p>}
            {t.species_latin && <p className="italic text-slate-500">{t.species_latin}</p>}
            <p className="mt-2 text-sm text-slate-600">{t.park} · {t.gmina.name}</p>
            {t.is_monument && (
              <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900" data-testid="public-tree-monument">
                <Award className="h-6 w-6 shrink-0 text-amber-600" />
                <div className="text-sm">
                  <div className="font-bold">Pomnik przyrody</div>
                  {(t.monument_decision || t.monument_date) && <div className="text-xs">{t.monument_decision}{t.monument_date ? ` z dnia ${fmtDate(t.monument_date)}` : ""}</div>}
                </div>
              </div>
            )}
            {t.is_staff && (
              <Link to={`/staff/trees/${t.staff_tree_id}`} data-testid="public-open-staff-card" className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-[#1B4332] px-5 text-sm font-semibold text-white"><ClipboardList className="h-4 w-4" />Otwórz kartę służbową</Link>
            )}
          </div>
        </div>

        {t.report_block_reason === "login" && <SpeciesInfo name={t.species} latin={t.species_latin} gid={t.gmina.id} />}
        {!t.service_active ? <ServiceUnavailable text="Pełne informacje o drzewie i zgłoszenia są chwilowo niedostępne." /> : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Fact icon={Calendar} label="Rok posadzenia" value={t.planted_year ? `${t.planted_year} (${age} lat)` : "—"} testId="public-tree-year" />
              <Fact icon={Ruler} label="Obwód / wysokość" value={`${t.circumference_cm ?? "—"} cm / ${t.height_m ?? "—"} m`} testId="public-tree-size" />
              <Fact icon={MapPin} label="Lokalizacja" value={t.location_desc || "—"} testId="public-tree-location" />
              <Fact icon={Wrench} label="Ostatnia praca" value={t.last_work ? `${WORK_TYPES[t.last_work.type]}, ${fmtDate(t.last_work.date)}` : "Brak wpisów"} testId="public-tree-last-work" />
            </div>
            {t.description && <p className="rounded-2xl border border-emerald-100 bg-white p-5 text-sm leading-relaxed text-slate-700">{t.description}</p>}
            {t.history && (
              <section className="rise rounded-3xl border border-emerald-100 bg-white p-5 sm:p-6" data-testid="public-tree-history">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800"><ScrollText className="h-5 w-5 text-[#2D6A4F]" />Historia drzewa</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{t.history}</p>
              </section>
            )}
            <div className="flex flex-wrap gap-4">
              {t.lat && t.lng && <Link to={`/?tree=${token}`} data-testid="public-tree-park-map-link" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2D6A4F] hover:underline"><MapIcon className="h-4 w-4" />{tr("showOnMap")}</Link>}
              {t.lat && t.lng && (
                <a href={`https://www.google.com/maps?q=${t.lat},${t.lng}`} target="_blank" rel="noreferrer" data-testid="public-tree-map-link" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2D6A4F] hover:underline"><MapPin className="h-4 w-4" />Nawiguj (Google Maps)</a>
              )}
            </div>
          </>
        )}
        {t.service_active && <WikiCard titles={[t.wiki_title, t.species_latin, t.species]} />}
        {t.report_block_reason !== "login" && (
          <Collapsible open={factsOpen} onOpenChange={setFactsOpen} className="rounded-3xl border border-emerald-100 bg-white" data-testid="public-species-collapsible">
            <CollapsibleTrigger data-testid="public-species-toggle" className="flex w-full items-center justify-between p-5 text-left font-bold text-slate-800">{tr("speciesFacts")}<span className="text-sm font-semibold text-[#2D6A4F]">{tr(factsOpen ? "hide" : "show")}</span></CollapsibleTrigger>
            <CollapsibleContent className="px-2 pb-2"><SpeciesInfo name={t.species} latin={t.species_latin} gid={t.gmina.id} /></CollapsibleContent>
          </Collapsible>
        )}

        {t.report_block_reason === "login" ? (
          <section className="grain rise relative overflow-hidden rounded-[28px] bg-[#1B4332] p-6 text-white" data-testid="public-join-section">
            <h2 className="text-xl font-bold">Mieszkasz w gminie {t.gmina.name}?</h2>
            <p className="mt-1 text-sm leading-relaxed text-emerald-50/85">Załóż konto mieszkańca z numerem PESEL, aby zgłaszać problemy z drzewami ze zdjęciem.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/register" data-testid="public-register-to-report" className="inline-flex h-11 items-center rounded-full bg-white px-6 text-sm font-semibold text-[#1B4332]">Zarejestruj się</Link>
              <Link to={`/login?next=${encodeURIComponent(`/t/${token}`)}`} data-testid="public-login-to-report" className="inline-flex h-11 items-center rounded-full border border-white/30 px-6 text-sm font-semibold text-white">Mam już konto</Link>
            </div>
          </section>
        ) : (
          <section className="rise rounded-3xl border border-emerald-100 bg-white p-5 sm:p-6" data-testid="public-report-section">
            <h2 className="text-xl font-bold text-slate-800">Zgłoś problem z drzewem</h2>
            <div className="mt-4">
              {t.can_report ? <ReportForm token={token} /> : <p data-testid="public-report-blocked" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{BLOCK[t.report_block_reason]}</p>}
            </div>
          </section>
        )}
      </article>
    </AppShell>
  );
}
