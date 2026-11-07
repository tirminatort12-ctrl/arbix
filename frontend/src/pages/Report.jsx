import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, ChevronRight, LocateFixed, Map as MapIcon, MapPin, ScanLine, TreeDeciduous } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import ReportForm from "@/components/ReportForm";
import { Spinner } from "@/components/Common";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";

const Option = ({ to, onClick, icon: Icon, title, sub, testId }) => {
  const body = (<>
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-50"><Icon className="h-6 w-6 text-[#B5541C]" /></span>
    <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-900">{title}</span><span className="block text-sm text-slate-500">{sub}</span></span>
    <ChevronRight className="h-5 w-5 text-slate-300" />
  </>);
  const cls = "flex w-full items-center gap-4 rounded-3xl border border-emerald-100 bg-white p-4 text-left active:scale-[0.99]";
  return to ? <Link to={to} data-testid={testId} className={cls}>{body}</Link> : <button type="button" onClick={onClick} data-testid={testId} className={cls}>{body}</button>;
};

const Gate = ({ next }) => {
  const { t } = useT();
  return (
    <div className="rise rounded-[28px] border border-orange-100 bg-white p-6 text-center" data-testid="report-gate-guest">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-orange-50"><AlertTriangle className="h-8 w-8 text-[#B5541C]" /></span>
      <h2 className="mt-4 text-xl font-bold text-slate-900">{t("rGuest")}</h2>
      <p className="mt-2 text-sm text-slate-500">{t("rGuestSub")}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link to={`/login?next=${encodeURIComponent(next)}`} data-testid="report-gate-login" className="inline-flex h-12 items-center justify-center rounded-full bg-[#1B4332] font-semibold text-white">{t("login")}</Link>
        <Link to="/register" data-testid="report-gate-register" className="inline-flex h-12 items-center justify-center rounded-full border border-emerald-200 font-semibold text-[#1B4332]">{t("register")}</Link>
      </div>
    </div>
  );
};

const Target = ({ target, onChange }) => {
  const { t } = useT();
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (target.t) api.get(`/public/trees/${target.t}`).then((r) => setLabel(`${r.data.tag_number} · ${r.data.species}`)).catch(() => setLabel(""));
    else if (target.osm) api.get(`/public/osm/trees/${target.osm}`).then((r) => setLabel(r.data.species || t("speciesUnknown"))).catch(() => setLabel(""));
  }, [target, t]);
  const kind = target.t ? t("rTree") : target.osm ? t("rOsm") : t("rAt");
  const Icon = target.lat ? MapPin : TreeDeciduous;
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-emerald-50 p-4" data-testid="report-target">
      <Icon className="h-6 w-6 shrink-0 text-[#2D6A4F]" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#2D6A4F]">{kind}</div>
        <div className="truncate font-semibold text-slate-800">{target.lat ? `${Number(target.lat).toFixed(5)}, ${Number(target.lng).toFixed(5)}` : label || "…"}</div>
      </div>
      <button type="button" onClick={onChange} data-testid="report-target-change" className="text-sm font-semibold text-[#2D6A4F]">{t("rChange")}</button>
    </div>
  );
};

export default function Report() {
  const { t } = useT();
  const { loading, user } = useAuth();
  const [sp, setSp] = useSearchParams();
  const target = { t: sp.get("t"), osm: sp.get("osm"), lat: sp.get("lat"), lng: sp.get("lng") };
  const has = target.t || target.osm || (target.lat && target.lng);
  const here = () => navigator.geolocation?.getCurrentPosition(
    (p) => setSp({ lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) }),
    () => toast.error(t("noLocation")), { timeout: 10000 });

  let body;
  if (loading) body = <Spinner />;
  else if (!user) body = <Gate next={`/zglos${window.location.search}`} />;
  else if (user.role !== "resident") body = (
    <div className="rounded-3xl border border-emerald-100 bg-white p-6 text-center" data-testid="report-gate-staff">
      <p className="font-semibold text-slate-800">{t("rStaff")}</p>
      <Link to="/app" className="mt-4 inline-flex h-11 items-center rounded-full bg-[#2D6A4F] px-6 text-sm font-semibold text-white">{t("openPanel")}</Link>
    </div>
  );
  else if (user.status !== "active") body = <p className="rounded-3xl bg-amber-50 p-5 text-amber-900" data-testid="report-gate-pending">{t("rPending")}</p>;
  else if (!has) body = (
    <div className="space-y-3" data-testid="report-choose">
      <h2 className="text-lg font-bold text-slate-800">{t("rWhere")}</h2>
      <Option to="/skanuj" icon={ScanLine} title={t("rScan")} sub={t("rScanSub")} testId="report-opt-scan" />
      <Option to="/" icon={MapIcon} title={t("rPick")} sub={t("rPickSub")} testId="report-opt-map" />
      <Option onClick={here} icon={LocateFixed} title={t("rHere")} sub={t("rHereSub")} testId="report-opt-here" />
    </div>
  );
  else body = (
    <div className="space-y-5">
      <Target target={target} onChange={() => setSp({})} />
      <ReportForm token={target.t} osmId={target.osm} lat={target.lat} lng={target.lng} />
      <p className="text-center text-xs text-slate-400">{t("rToGmina")}</p>
    </div>
  );
  return (
    <AppShell title={t("rTitle")} back>
      <h1 className="mb-5 text-2xl font-extrabold text-[#1B4332]">{t("rTitle")}</h1>
      {body}
    </AppShell>
  );
}
