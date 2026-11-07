import { useEffect, useState } from "react";
import { Bird, Bug, CalendarDays, Lightbulb, Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n";

export const useSpecies = (name, latin, gid) => {
  const { lang } = useT();
  const [d, setD] = useState(null);
  useEffect(() => {
    setD(null);
    if (!name || name.length < 2) return undefined;
    let tries = 0;
    let timer;
    let live = true;
    const go = () => api.get("/public/species-info", { params: { name, latin: latin || "", gid: gid || "", lang } }).then((r) => {
      if (!live) return;
      setD(r.data);
      if (r.data.status === "pending" && ++tries < 25) timer = setTimeout(go, 4000);
    }).catch(() => live && setD({ status: "none" }));
    go();
    return () => { live = false; clearTimeout(timer); };
  }, [name, latin, gid, lang]);
  return d;
};

const Chips = ({ icon: Icon, label, items, testId }) => (items?.length ? (
  <div data-testid={testId}>
    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><Icon className="h-3.5 w-3.5" />{label}</div>
    <div className="mt-2 flex flex-wrap gap-1.5">{items.map((x) => <span key={x} className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-[#1B4332]">{x}</span>)}</div>
  </div>
) : null);

export const SpeciesInfo = ({ name, latin, gid, compact = false }) => {
  const { t } = useT();
  const d = useSpecies(name, latin, gid);
  if (!d || d.status === "none") return null;
  if (d.status === "pending") return (
    <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-[#1B4332]" data-testid="species-info-pending">
      <Loader2 className="h-4 w-4 animate-spin" />{t("generating")}
    </div>
  );
  const c = d.content || {};
  return (
    <section className={`rise space-y-4 rounded-3xl border border-emerald-100 bg-white ${compact ? "p-4" : "p-5 sm:p-6"}`} data-testid="species-info">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800"><Sparkles className="h-5 w-5 text-[#2D6A4F]" />{t("learn")}</h2>
      {c.summary && <p className="text-[15px] leading-relaxed text-slate-700" data-testid="species-info-summary">{c.summary}</p>}
      <Chips icon={Bird} label={t("birds")} items={c.birds} testId="species-info-birds" />
      {!compact && <Chips icon={Bug} label={t("insects")} items={c.insects} testId="species-info-insects" />}
      {!compact && c.facts?.length > 0 && (
        <div data-testid="species-info-facts">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><Lightbulb className="h-3.5 w-3.5" />{t("facts")}</div>
          <ul className="mt-2 space-y-2">{c.facts.map((f) => <li key={f} className="flex gap-2 text-sm leading-relaxed text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#74C69D]" />{f}</li>)}</ul>
        </div>
      )}
      {!compact && c.season && <p className="flex gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900"><CalendarDays className="h-4 w-4 shrink-0" />{c.season}</p>}
      <p className="text-xs text-slate-400" data-testid="species-info-source">{d.source === "gmina" ? t("gminaNote") : t("aiNote")}</p>
    </section>
  );
};
