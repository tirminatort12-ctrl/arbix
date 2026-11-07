import { useEffect, useState } from "react";
import { BookOpen, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";

export default function WikiCard({ titles }) {
  const [w, setW] = useState(null);
  const key = titles.filter(Boolean).join("|");
  useEffect(() => {
    let cancel = false;
    (async () => {
      for (const t of key.split("|").filter(Boolean)) {
        try {
          const { data } = await api.get("/public/wiki", { params: { title: t } });
          if (data.found) { if (!cancel) setW(data); return; }
        } catch (e) {
          console.error(`Wikipedia lookup failed for "${t}"`, e); // try the next title
        }
      }
      if (!cancel) setW({ found: false });
    })();
    return () => { cancel = true; };
  }, [key]);
  if (!w?.found) return null;
  return (
    <section className="rise rounded-3xl border border-emerald-100 bg-white p-5 sm:p-6" data-testid="wiki-card">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800"><BookOpen className="h-5 w-5 text-[#2D6A4F]" />O gatunku: {w.title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-700" data-testid="wiki-extract">{w.extract}</p>
      {w.url && <a href={w.url} target="_blank" rel="noreferrer" data-testid="wiki-link" className="mt-4 inline-flex h-11 items-center gap-2 rounded-full border border-emerald-200 px-5 text-sm font-semibold text-[#1B4332] hover:bg-emerald-50">Czytaj w Wikipedii <ExternalLink className="h-4 w-4" /></a>}
      <p className="mt-3 text-[11px] text-slate-400">Źródło: Wikipedia, wolna encyklopedia — tekst na licencji <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.pl" target="_blank" rel="noreferrer" className="underline">CC BY-SA 4.0</a>.</p>
    </section>
  );
}
