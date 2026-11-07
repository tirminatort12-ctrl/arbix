import { Link } from "react-router-dom";
import { Award, Calendar } from "lucide-react";
import { imgOf, fileUrl } from "@/lib/api";
import { PLACE_CATS } from "@/lib/labels";

const MONUMENT_IMGS = [
  "https://images.unsplash.com/photo-1695462935702-05bb400b81ba?crop=entropy&cs=srgb&fm=jpg&q=80&w=800",
  "https://images.pexels.com/photos/33881620/pexels-photo-33881620.jpeg?auto=compress&cs=tinysrgb&w=800",
];
export const PLACEHOLDER = "https://images.unsplash.com/photo-1760289029369-cc48275b8d80?crop=entropy&cs=srgb&fm=jpg&q=80&w=800";

export const toAttractions = (places = [], trees = []) => [
  ...trees.filter((t) => t.is_monument).map((t, i) => ({
    key: `m-${t.public_token}`, cat: "monument", label: "Pomnik przyrody", name: t.monument_name || t.species, sub: t.species,
    img: t.photo_path ? fileUrl(t.photo_path) : MONUMENT_IMGS[i % MONUMENT_IMGS.length], to: `/t/${t.public_token}`, testKey: t.tag_number,
  })),
  ...places.map((p) => ({
    key: `p-${p.id}`, cat: p.category, label: PLACE_CATS[p.category], name: p.name, sub: p.park,
    img: imgOf(p) || PLACEHOLDER, to: `/atrakcje/${p.id}`, testKey: p.id,
  })),
];

export const AttractionCard = ({ a, wide = false }) => (
  <Link to={a.to} data-testid={`attraction-${a.testKey}`}
    className={`group block shrink-0 snap-start active:scale-[0.98] ${wide ? "w-full" : "w-64 sm:w-72"}`}>
    <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-emerald-50">
      <img src={a.img} alt={a.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      <span className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold ${a.cat === "monument" ? "text-amber-700" : "text-[#1B4332]"}`}>
        {a.cat === "monument" && <Award className="h-3.5 w-3.5" />}{a.label}
      </span>
    </div>
    <div className="px-1 pt-2.5">
      <div className="truncate font-semibold text-slate-900">{a.name}</div>
      {a.sub && <div className="truncate text-sm text-slate-500">{a.sub}</div>}
    </div>
  </Link>
);

export const fmtNewsDate = (iso) => new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "long" });

export const NewsRow = ({ n }) => (
  <Link to={`/aktualnosci/${n.id}`} data-testid={`news-${n.id}`} className="flex gap-4 py-3 active:opacity-80">
    <img src={imgOf(n) || PLACEHOLDER} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1 text-xs text-slate-500"><Calendar className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{fmtNewsDate(n.created_at)}{n.park ? ` · ${n.park}` : ""}</span></div>
      <div className="mt-0.5 line-clamp-2 font-semibold leading-snug text-slate-900">{n.title}</div>
      <div className="mt-0.5 line-clamp-1 text-sm text-slate-500">{n.body}</div>
    </div>
  </Link>
);

export const NewsHero = ({ n }) => (
  <Link to={`/aktualnosci/${n.id}`} data-testid={`news-${n.id}`} className="group relative block overflow-hidden rounded-[26px] active:scale-[0.99]">
    <img src={imgOf(n) || PLACEHOLDER} alt="" className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
      <div className="text-xs font-semibold text-white/80">{fmtNewsDate(n.created_at)}{n.park ? ` · ${n.park}` : ""}</div>
      <div className="mt-1 text-xl font-bold leading-snug">{n.title}</div>
    </div>
  </Link>
);

export const SectionHead = ({ title, to, testId, sub }) => (
  <div className="mb-3 flex items-end justify-between gap-3">
    <div>
      {sub && <p className="text-xs font-semibold uppercase tracking-wider text-[#2D6A4F]">{sub}</p>}
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
    </div>
    {to && <Link to={to} data-testid={testId} className="shrink-0 text-sm font-semibold text-[#2D6A4F] underline-offset-4 hover:underline">Zobacz wszystkie</Link>}
  </div>
);
