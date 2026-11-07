import AppShell from "@/components/AppShell";
import { Spinner } from "@/components/Common";
import { NewsHero, NewsRow } from "@/components/Cards";
import { useGmina, usePublicList } from "@/lib/gmina";

export default function News() {
  const { gid } = useGmina();
  const news = usePublicList(gid, "news");
  return (
    <AppShell title="Aktualności">
      <div className="space-y-4" data-testid="news-page">
        <h1 className="text-2xl font-extrabold text-[#1B4332]">Aktualności z parków</h1>
        {!news ? <Spinner /> : news.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-emerald-200 bg-white p-8 text-center text-sm text-slate-500" data-testid="news-empty">Na razie brak aktualności.</p>
        ) : (
          <>
            <NewsHero n={news[0]} />
            <div className="divide-y divide-emerald-50" data-testid="news-list">{news.slice(1).map((n) => <NewsRow key={n.id} n={n} />)}</div>
          </>
        )}
      </div>
    </AppShell>
  );
}
