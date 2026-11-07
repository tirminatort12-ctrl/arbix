import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, ChevronRight, ClipboardList, Copy, ExternalLink, LocateFixed, Navigation, Navigation2, Share2, X } from "lucide-react";
import { SpeciesInfo } from "@/components/SpeciesInfo";
import { useAuth } from "@/lib/auth";
import { api, fileUrl, imgOf } from "@/lib/api";
import { PLACE_CATS } from "@/lib/labels";
import { useT } from "@/lib/i18n";

const COND = { good: ["lgGood", "bg-emerald-100 text-emerald-800"], attention: ["lgAttention", "bg-amber-100 text-amber-800"], danger: ["lgDanger", "bg-rose-100 text-rose-800"] };

const R = Math.PI / 180;
export const distBearing = ([la1, lo1], [la2, lo2]) => {
  const dLa = (la2 - la1) * R, dLo = (lo2 - lo1) * R;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * R) * Math.cos(la2 * R) * Math.sin(dLo / 2) ** 2;
  const y = Math.sin(dLo) * Math.cos(la2 * R);
  const x = Math.cos(la1 * R) * Math.sin(la2 * R) - Math.sin(la1 * R) * Math.cos(la2 * R) * Math.cos(dLo);
  return { m: 12742000 * Math.asin(Math.sqrt(a)), deg: (Math.atan2(y, x) / R + 360) % 360 };
};
const fmtDist = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`);

const Distance = ({ me, item }) => {
  const { t } = useT();
  const { m, deg } = distBearing(me, [item.lat, item.lng]);
  const near = m < 15;
  return (
    <div className={`mt-4 flex items-center gap-3 rounded-2xl p-3 ${near ? "bg-emerald-600 text-white" : "bg-sky-50 text-sky-900"}`} data-testid="sheet-distance">
      {near ? <LocateFixed className="h-6 w-6" /> : <Navigation2 className="h-6 w-6 text-sky-600" style={{ transform: `rotate(${deg}deg)` }} />}
      <div className="min-w-0 flex-1">
        <div className="text-lg font-extrabold leading-tight" data-testid="sheet-distance-value">{near ? t("onSite") : `${fmtDist(m)} ${t("fromYou")}`}</div>
        <div className={`flex items-center gap-1.5 text-xs ${near ? "text-emerald-50" : "text-sky-700"}`}><span className="h-2 w-2 animate-pulse rounded-full bg-current" />{t("tracking")}</div>
      </div>
    </div>
  );
};

const Info = ({ label, children, testId }) => (
  <div className="min-w-0">
    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
    <div className="mt-0.5 truncate font-semibold text-slate-800" data-testid={testId}>{children}</div>
  </div>
);

const Btn = ({ children, className = "", ...p }) => (
  <a {...p} className={`inline-flex h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-transform active:scale-[0.97] ${className}`}>{children}</a>
);

const Coords = ({ lat, lng }) => {
  const { t } = useT();
  const txt = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  return (
    <div className="col-span-2">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t("coords")}</div>
      <button type="button" data-testid="sheet-copy-coords" onClick={() => navigator.clipboard?.writeText(txt).then(() => toast.success(t("copied")))} className="mt-0.5 inline-flex items-center gap-2 font-mono text-[15px] text-slate-800">
        {txt}<Copy className="h-4 w-4 text-[#2D6A4F]" />
      </button>
    </div>
  );
};

const useOsmDetail = (item) => {
  const [d, setD] = useState(null);
  useEffect(() => {
    setD(null);
    if (item?.kind === "osm") api.get(`/public/osm/trees/${item.osm_id}`).then((r) => setD(r.data)).catch((e) => { console.error("OSM tree details failed", e); setD({}); });
  }, [item]);
  return d;
};

const Photo = ({ src }) => <img src={src} alt="" className="aspect-[16/9] w-full rounded-2xl object-cover" data-testid="sheet-photo" />;

const Label = ({ children }) => <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{children}</div>;

const Condition = ({ value, t }) => {
  const [key, cls] = COND[value] || COND.good;
  return <div><Label>{t("condition")}</Label><div className="mt-1"><span data-testid="sheet-condition" className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{t(key)}</span></div></div>;
};

const treeContent = (item, t) => ({
  kicker: item.is_monument ? t("monument") : t("registered"),
  kickerCls: item.is_monument ? "text-amber-600" : "text-[#2D6A4F]",
  title: (item.is_monument && item.monument_name) || item.species,
  sub: item.is_monument && item.monument_name ? item.species : item.species_latin,
  photo: item.photo_path ? fileUrl(item.photo_path) : null,
  grid: (<>
    <Info label={t("gmina")}>{item.gmina_name}</Info>
    <Info label={t("park")}>{item.park || "—"}</Info>
    <Info label={t("tag")}><span className="font-mono-tag">{item.tag_number}</span></Info>
    {item.condition && <Condition value={item.condition} t={t} />}
  </>),
  reportTo: `/zglos?t=${item.public_token}`,
  detailsTo: `/t/${item.public_token}`,
  shareUrl: `${window.location.origin}/t/${item.public_token}`,
});

const placeContent = (item, t) => ({
  kicker: PLACE_CATS[item.category] || t("attraction"),
  kickerCls: "text-[#0369A1]",
  title: item.name,
  sub: item.gmina_name,
  photo: imgOf(item),
  detailsTo: `/atrakcje/${item.id}`,
  shareUrl: `${window.location.origin}/atrakcje/${item.id}`,
});

const osmGmina = (osm) => {
  if (!osm) return "…";
  return osm.gmina || "—";
};

const osmContent = (item, t, osm) => {
  const source = `https://www.openstreetmap.org/node/${item.osm_id}`;
  return {
    kicker: t("publicTree"),
    kickerCls: "text-[#2D6A4F]",
    title: item.name || t("tree"),
    sub: item.species || osm?.species || t("speciesUnknown"),
    grid: (<>
      <Info label={t("osmId")}><a href={source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#2D6A4F]" data-testid="sheet-osm-id">{item.osm_id}<ExternalLink className="h-3.5 w-3.5" /></a></Info>
      <Info label={t("gmina")} testId="sheet-osm-gmina">{osmGmina(osm)}</Info>
      {osm?.height && <Info label={t("height")}>{osm.height} m</Info>}
      {osm?.circumference && <Info label={t("circumference")}>{osm.circumference} m</Info>}
    </>),
    note: t("unverified"),
    reportTo: `/zglos?osm=${item.osm_id}`,
    source,
    shareUrl: source,
  };
};

const contentFor = (item, t, osm) => {
  if (item.kind === "tree") return treeContent(item, t);
  if (item.kind === "place") return placeContent(item, t);
  return osmContent(item, t, osm);
};

const SheetHeader = ({ c, onShare, onClose, t }) => (
  <div className="flex items-start gap-3">
    <div className="min-w-0 flex-1">
      <div className={`text-[11px] font-bold uppercase tracking-wider ${c.kickerCls}`} data-testid="sheet-kicker">{c.kicker}</div>
      <h2 className="mt-0.5 text-2xl font-extrabold leading-tight text-slate-900" data-testid="sheet-title">{c.title}</h2>
      {c.sub && <div className="truncate text-[15px] text-slate-500" data-testid="sheet-sub">{c.sub}</div>}
    </div>
    <button type="button" onClick={onShare} aria-label={t("share")} data-testid="sheet-share" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-[#1B4332]"><Share2 className="h-4 w-4" /></button>
    <button type="button" onClick={onClose} aria-label="Zamknij" data-testid="sheet-close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700"><X className="h-5 w-5" /></button>
  </div>
);

const SheetActions = ({ c, item, staffHere, guest, t }) => {
  const nav = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;
  const detailsLabel = guest && item.kind === "tree" ? t("moreAbout") : t("details");
  return (
    <div className="mt-4 space-y-3">
      {c.reportTo && <Link to={c.reportTo} data-testid="sheet-report" className="flex h-14 items-center justify-center gap-2 rounded-full bg-[#B5541C] text-base font-semibold text-white active:scale-[0.98]"><AlertTriangle className="h-5 w-5" />{t("reportEvent")}</Link>}
      <div className="grid grid-cols-2 gap-3">
        {c.detailsTo && <Link to={c.detailsTo + (staffHere ? "?widok=mieszkaniec" : "")} data-testid="sheet-details" className="inline-flex h-12 items-center justify-center gap-1 rounded-full bg-[#1B4332] text-sm font-semibold text-white">{detailsLabel}<ChevronRight className="h-4 w-4" /></Link>}
        {!c.detailsTo && <Btn href={c.source} target="_blank" rel="noreferrer" data-testid="sheet-source-btn" className="bg-[#1B4332] text-white">{t("source")}<ExternalLink className="h-4 w-4" /></Btn>}
        <Btn href={nav} target="_blank" rel="noreferrer" data-testid="sheet-navigate" className="border border-emerald-200 text-[#1B4332]"><Navigation className="h-4 w-4" />{t("navigate")}</Btn>
      </div>
    </div>
  );
};

const STAFF = ["worker", "gmina_admin"];

export default function MapSheet({ item, onClose, me }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [item]);
  const { user } = useAuth();
  const osm = useOsmDetail(item);
  if (!item) return null;
  const c = contentFor(item, t, osm);
  const staff = STAFF.includes(user?.role);
  const staffHere = staff && item.kind === "tree" && user.gmina_id === item.gmina_id;
  if (staff) c.reportTo = null;
  const speciesName = item.kind === "tree" ? item.species : item.species || osm?.species;
  const share = () => {
    if (navigator.share) navigator.share({ url: c.shareUrl }).catch((e) => console.info("Share cancelled", e));
    else navigator.clipboard?.writeText(c.shareUrl).then(() => toast.success(t("copied")));
  };
  return (
    <div className="absolute inset-x-0 bottom-0 z-[900] md:inset-x-auto md:bottom-4 md:left-4 md:w-[400px]" data-testid="map-sheet">
      <div className={`sheet-up overflow-y-auto rounded-t-[28px] bg-white px-5 pb-10 pt-1 shadow-[0_-10px_40px_rgba(0,0,0,0.18)] transition-[max-height] duration-300 md:max-h-[80vh] md:rounded-[28px] md:pb-6 ${open ? "max-h-[78vh]" : "max-h-[44vh]"}`} data-open={open}>
        <button type="button" onClick={() => setOpen(!open)} aria-label="Rozwiń" data-testid="sheet-handle" className="mx-auto mb-2 flex h-6 w-16 items-center justify-center md:hidden"><span className="h-1.5 w-10 rounded-full bg-slate-300" /></button>
        <SheetHeader c={c} onShare={share} onClose={onClose} t={t} />
        {me && item.kind !== "place" && <Distance me={me} item={item} />}
        {staffHere && <Link to={c.detailsTo} data-testid="sheet-service-card" className="mt-4 flex h-14 items-center justify-center gap-2 rounded-full bg-[#1B4332] text-base font-semibold text-white active:scale-[0.98]"><ClipboardList className="h-5 w-5" />{t("serviceCard")}</Link>}
        <SheetActions c={c} item={item} staffHere={staffHere} guest={!user} t={t} />
        {c.photo && <div className="mt-4"><Photo src={c.photo} /></div>}
        {!user && item.kind !== "place" && speciesName && <div className="mt-4"><SpeciesInfo name={speciesName} latin={item.species_latin} gid={item.gmina_id} compact /></div>}
        {item.kind !== "place" && <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">{c.grid}<Coords lat={item.lat} lng={item.lng} /></div>}
        {c.note && <p className="mt-3 text-sm text-slate-500" data-testid="sheet-note">{c.note}</p>}
      </div>
    </div>
  );
}
