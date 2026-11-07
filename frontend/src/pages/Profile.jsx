import { Link, useNavigate } from "react-router-dom";
import { Building2, CheckCircle2, ChevronRight, ClipboardList, KeyRound, LogOut, Shield, Smartphone } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { ROLE_NAMES } from "@/lib/labels";

const Row = ({ to, icon: Icon, label, testId, onClick, danger }) => {
  const cls = `flex w-full items-center gap-3 border-b border-emerald-50 px-4 py-4 text-left last:border-0 hover:bg-emerald-50/40 ${danger ? "text-rose-600" : "text-slate-800"}`;
  const inner = <><Icon className="h-5 w-5 shrink-0" /><span className="flex-1 font-semibold">{label}</span>{!danger && <ChevronRight className="h-4 w-4 text-slate-300" />}</>;
  return to ? <Link to={to} data-testid={testId} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} data-testid={testId} className={cls}>{inner}</button>;
};

export default function Profile() {
  const { user, gmina, signOut } = useAuth();
  const nav = useNavigate();
  return (
    <AppShell title={user ? "Profil" : "Dołącz"}>
      <div className="space-y-5" data-testid="profile-page">
        {user ? (
          <div className="flex items-center gap-4 rounded-3xl border border-emerald-100 bg-white p-5" data-testid="profile-card">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-xl font-bold text-[#1B4332]">{(user.first_name?.[0] || "") + (user.last_name?.[0] || "")}</span>
            <div className="min-w-0">
              <div className="truncate text-lg font-bold text-slate-800" data-testid="profile-name">{user.first_name} {user.last_name}</div>
              <div className="text-sm text-slate-500">{ROLE_NAMES[user.role]}{gmina ? ` · ${gmina.name}` : ""}</div>
              {user.status === "pending" && <div className="mt-1 text-xs font-semibold text-amber-700">Konto czeka na zatwierdzenie</div>}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-emerald-100 bg-white p-5" data-testid="profile-guest">
            <div className="text-xl font-bold text-slate-800">Konto mieszkańca</div>
            <p className="mt-1 text-sm text-slate-500">Dla mieszkańców gminy — rejestracja z numerem PESEL.</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {["Zgłaszaj problemy z drzewami ze zdjęciem", "Śledź, jak gmina realizuje Twoje zgłoszenia", "Skanuj kody na drzewach w aplikacji"].map((x) => <li key={x} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#2D6A4F]" />{x}</li>)}
            </ul>
            <div className="mt-4 flex gap-2">
              <Link to="/login" data-testid="profile-login" className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-[#2D6A4F] text-sm font-semibold text-white">Zaloguj się</Link>
              <Link to="/register" data-testid="profile-register" className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-emerald-200 text-sm font-semibold text-[#1B4332]">Zarejestruj się</Link>
            </div>
          </div>
        )}
        <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white">
          {user?.role === "resident" && <Row to="/zgloszenia" icon={ClipboardList} label="Moje zgłoszenia" testId="profile-my-reports" />}
          {user && user.role !== "resident" && <Row to="/app" icon={Building2} label="Panel pracy" testId="profile-panel" />}
          {!user && <Row to="/login" icon={Building2} label="Panel gminy" testId="profile-gmina-panel" />}
          {!user && <Row to="/activate" icon={KeyRound} label="Aktywuj konto kodem" testId="profile-activate" />}
        </div>
        <div className="rounded-3xl bg-emerald-50 p-5" data-testid="profile-install">
          <div className="flex items-center gap-2 font-semibold text-[#1B4332]"><Smartphone className="h-5 w-5" />Aplikacja na telefonie</div>
          <p className="mt-2 text-sm text-[#1B4332]/80">Android: menu ⋮ → „Dodaj do ekranu głównego”.<br />iPhone: Udostępnij → „Do ekranu początkowego”.</p>
        </div>
        <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white">
          <div className="flex items-center gap-3 px-4 py-4 text-sm text-slate-500"><Shield className="h-5 w-5 shrink-0" />Twoje dane są chronione zgodnie z RODO. Numer PESEL nie jest widoczny dla innych.</div>
          {user && <Row icon={LogOut} label="Wyloguj się" testId="logout-button" danger onClick={() => { signOut(); nav("/"); }} />}
        </div>
        <p className="text-center text-xs text-slate-400">ARBIX · wersja 1.0</p>
      </div>
    </AppShell>
  );
}
