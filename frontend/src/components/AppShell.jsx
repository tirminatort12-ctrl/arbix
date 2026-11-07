import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Briefcase, ChevronLeft, ClipboardList, Landmark, Map as MapIcon, Newspaper, ScanLine, TreeDeciduous, UserPlus, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { LangSwitch } from "@/components/LangSwitch";

const MAP = { to: "/", k: "map", icon: MapIcon, id: "map" };
const ATTR = { to: "/atrakcje", k: "attractions", icon: Landmark, id: "attractions" };
const NEWS = { to: "/aktualnosci", k: "news", icon: Newspaper, id: "news" };
const REPORT = { to: "/zglos", k: "report", icon: AlertTriangle, id: "report", center: true, warn: true };
const SCAN = { to: "/skanuj", k: "scan", icon: ScanLine, id: "scan", center: true };
const tabsFor = (user) => {
  if (!user) return [MAP, ATTR, SCAN, NEWS, { to: "/profil", k: "join", icon: UserPlus, id: "profile" }];
  if (user.role === "resident") return [MAP, ATTR, REPORT, { to: "/zgloszenia", k: "myReports", icon: ClipboardList, id: "reports" }, { to: "/profil", k: "profile", icon: UserRound, id: "profile" }];
  return [MAP, ATTR, SCAN, { to: "/app", k: "panel", icon: Briefcase, id: "panel" }, { to: "/profil", k: "profile", icon: UserRound, id: "profile" }];
};

const isActive = (path, to) => (to === "/" ? path === "/" || path === "/mapa" : path.startsWith(to));

const Avatar = () => {
  const { user } = useAuth();
  const { t } = useT();
  if (!user) return <Link to="/login" data-testid="appbar-login" className="hidden rounded-full bg-[#2D6A4F] px-4 py-2 text-sm font-semibold text-white sm:inline-flex">{t("login")}</Link>;
  return (
    <Link to="/profil" data-testid="appbar-avatar" className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-[#1B4332]">
      {(user.first_name?.[0] || "") + (user.last_name?.[0] || "")}
    </Link>
  );
};

const BottomNav = ({ path }) => {
  const { user } = useAuth();
  const { t } = useT();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[1000] border-t border-emerald-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" data-testid="bottom-nav">
      <div className="mx-auto grid h-16 max-w-xl grid-cols-5">
        {tabsFor(user).map((tab) => {
          const on = isActive(path, tab.to);
          if (tab.center) return (
            <Link key={tab.id} to={tab.to} data-testid={`tab-${tab.id}`} className="relative flex flex-col items-center justify-end pb-1.5">
              <span className={`absolute -top-5 grid h-14 w-14 place-items-center rounded-full text-white shadow-lg ring-4 ring-[#F8FAF6] transition-transform active:scale-95 ${tab.warn ? "bg-[#B5541C] shadow-orange-900/25" : "bg-[#2D6A4F] shadow-emerald-900/25"}`}><tab.icon className="h-6 w-6" /></span>
              <span className={`truncate text-[11px] font-semibold ${on ? "text-[#1B4332]" : "text-slate-500"}`}>{t(tab.k)}</span>
            </Link>
          );
          return (
            <Link key={tab.id} to={tab.to} data-testid={`tab-${tab.id}`} className="flex min-w-0 flex-col items-center justify-center gap-0.5 active:scale-95">
              <span className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${on ? "bg-emerald-100 text-[#1B4332]" : "text-slate-500"}`}><tab.icon className="h-5 w-5" /></span>
              <span className={`max-w-full truncate px-0.5 text-[11px] font-semibold ${on ? "text-[#1B4332]" : "text-slate-500"}`}>{t(tab.k)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

const SideNav = ({ path }) => {
  const { user } = useAuth();
  const { t } = useT();
  const tabs = [...tabsFor(user).slice(0, 2), NEWS, ...tabsFor(user).slice(2).filter((x) => x.id !== "news")];
  return (
    <aside className="fixed inset-y-0 left-0 z-[1000] hidden w-64 flex-col border-r border-emerald-100 bg-white p-4 md:flex" data-testid="side-nav">
      <Link to="/" className="mb-8 flex items-center gap-2 px-2 pt-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2D6A4F] text-white"><TreeDeciduous className="h-5 w-5" /></span>
        <span className="font-display text-xl font-bold text-[#1B4332]">ARBIX</span>
      </Link>
      {tabs.map((tab) => (
        <Link key={tab.id} to={tab.to} data-testid={`side-${tab.id}`}
          className={`mb-1 flex h-12 items-center gap-3 rounded-2xl px-4 font-semibold transition-colors ${isActive(path, tab.to) ? "bg-emerald-100 text-[#1B4332]" : tab.warn ? "text-[#B5541C] hover:bg-orange-50" : "text-slate-600 hover:bg-emerald-50"}`}>
          <tab.icon className="h-5 w-5" />{tab.warn ? t("reportEvent") : t(tab.k)}
        </Link>
      ))}
    </aside>
  );
};

export default function AppShell({ children, title, back = false, wide = false, action, bleed = false }) {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const width = wide ? "max-w-5xl" : "max-w-xl md:max-w-3xl";
  return (
    <div className="min-h-screen bg-[#F8FAF6]">
      <SideNav path={pathname} />
      <div className="md:pl-64">
        <header className="sticky top-0 z-[999] border-b border-emerald-100/70 bg-[#F8FAF6]/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className={`mx-auto flex h-14 items-center gap-2 px-4 ${bleed ? "" : width}`}>
            {back ? (
              <button type="button" onClick={() => (window.history.length > 1 ? nav(-1) : nav("/"))} data-testid="appbar-back" aria-label="Wstecz" className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-[#1B4332] hover:bg-emerald-50"><ChevronLeft className="h-6 w-6" /></button>
            ) : (
              <Link to="/" className="md:hidden" data-testid="appbar-logo"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#1B4332] text-white"><TreeDeciduous className="h-5 w-5" /></span></Link>
            )}
            <div className="min-w-0 flex-1 truncate font-display text-lg font-bold text-[#1B4332]" data-testid="appbar-title">{title}</div>
            {action}
            <LangSwitch />
            <Avatar />
          </div>
        </header>
        {bleed ? <main>{children}</main> : <main className={`mx-auto px-4 pb-28 pt-4 md:pb-12 ${width}`}>{children}</main>}
      </div>
      <BottomNav path={pathname} />
    </div>
  );
}
