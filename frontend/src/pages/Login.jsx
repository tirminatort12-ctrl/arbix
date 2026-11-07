import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Shell from "@/components/Shell";
import { Field } from "@/components/Common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import DemoAccess from "@/components/DemoAccess";

export const AuthCard = ({ title, subtitle, children }) => (
  <div className="rise mx-auto max-w-md rounded-3xl border border-emerald-100 bg-white p-6 sm:p-8">
    <h1 className="text-3xl font-extrabold text-[#1B4332]">{title}</h1>
    {subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}
    <div className="mt-6">{children}</div>
  </div>
);

export default function Login() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.post("/auth/login", { login, password });
      await signIn(data.token);
      nav(sp.get("next") || "/app", { replace: true });
    } catch (e2) {
      setErr(errMsg(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <AuthCard title="Zaloguj się" subtitle="Mieszkańcy i pracownicy logują się numerem PESEL, administratorzy — adresem e-mail.">
        <form onSubmit={submit} className="space-y-4" data-testid="login-form">
          <Field label="PESEL lub e-mail">
            <Input data-testid="login-pesel-input" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" inputMode="text" className="h-12 rounded-xl text-base" required />
          </Field>
          <Field label="Hasło">
            <Input data-testid="login-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="h-12 rounded-xl text-base" required />
          </Field>
          {err && <p data-testid="login-error" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
          <Button data-testid="login-submit-button" disabled={busy} className="h-12 w-full rounded-xl text-base">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Zaloguj się</Button>
        </form>
        <DemoAccess next={sp.get("next")} />
        <div className="mt-6 space-y-2 text-sm text-slate-600">
          <p>Nie masz konta? <Link to="/register" data-testid="login-register-link" className="font-semibold text-[#2D6A4F] hover:underline">Zarejestruj się</Link></p>
          <p>Masz kod aktywacyjny lub zapomniałeś hasła? <Link to="/activate" data-testid="login-activate-link" className="font-semibold text-[#2D6A4F] hover:underline">Aktywuj konto</Link></p>
          <p className="text-xs text-slate-500">Nowy kod aktywacyjny (reset hasła) wydaje administrator Twojej gminy.</p>
        </div>
      </AuthCard>
    </Shell>
  );
}
