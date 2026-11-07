import { Link, useNavigate } from "react-router-dom";
import { LogOut, Map as MapIcon, ScanLine, TreeDeciduous } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ROLE_NAMES } from "@/lib/labels";

export const Logo = () => (
  <Link to="/" data-testid="header-logo-link" className="flex items-center gap-2">
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#2D6A4F] text-white"><TreeDeciduous className="h-5 w-5" /></span>
    <span className="font-display text-lg font-bold text-[#1B4332]">ARBIX</span>
  </Link>
);

export default function Shell({ children, wide = false }) {
  const { user, gmina, signOut } = useAuth();
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-[#F8FAF6]">
      <header className="sticky top-0 z-50 h-16 border-b border-emerald-100 bg-white">
        <div className={`mx-auto flex h-full items-center justify-between px-4 ${wide ? "max-w-7xl" : "max-w-3xl"}`}>
          <Logo />
          {user ? (
            <div className="flex items-center gap-3">
              <Link to="/skanuj" data-testid="header-scan-link" aria-label="Skanuj arbotag" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#2D6A4F] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1B4332]"><ScanLine className="h-5 w-5" /><span className="hidden sm:inline">Skanuj arbotag</span></Link>
              <Link to="/" data-testid="header-map-link" aria-label="Mapa" className="grid h-11 w-11 place-items-center rounded-full border border-emerald-100 text-[#2D6A4F] transition-colors hover:bg-emerald-50"><MapIcon className="h-5 w-5" /></Link>
              <div className="hidden text-right sm:block" data-testid="header-user-info">
                <div className="text-sm font-semibold text-slate-800">{user.first_name} {user.last_name}</div>
                <div className="text-xs text-slate-500">{ROLE_NAMES[user.role]}{gmina ? ` · ${gmina.name}` : ""}</div>
              </div>
              <button data-testid="logout-button" onClick={() => { signOut(); nav("/"); }}
                className="grid h-11 w-11 place-items-center rounded-full border border-emerald-100 text-slate-600 transition-colors hover:bg-emerald-50" aria-label="Wyloguj">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/mapa" data-testid="header-map-link" aria-label="Mapa" className="grid h-11 w-11 place-items-center rounded-full border border-emerald-100 text-[#2D6A4F] transition-colors hover:bg-emerald-50"><MapIcon className="h-5 w-5" /></Link>
              <Link to="/login" data-testid="header-login-link" className="rounded-full bg-[#2D6A4F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1B4332]">Zaloguj się</Link>
            </div>
          )}
        </div>
      </header>
      <main className={`mx-auto px-4 py-6 sm:px-6 ${wide ? "max-w-7xl" : "max-w-3xl"}`}>{children}</main>
    </div>
  );
}
