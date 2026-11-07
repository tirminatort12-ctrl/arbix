import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Shell from "@/components/Shell";
import { Field } from "@/components/Common";
import { AuthCard } from "@/pages/Login";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function Activate() {
  const [f, setF] = useState({ login: "", code: "", password: "", password2: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { signIn } = useAuth();
  const nav = useNavigate();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (f.password.length < 8) return setErr("Hasło musi mieć co najmniej 8 znaków");
    if (f.password !== f.password2) return setErr("Hasła nie są identyczne");
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.post("/auth/activate", { login: f.login, code: f.code, password: f.password });
      await signIn(data.token);
      nav("/app", { replace: true });
    } catch (e2) {
      setErr(errMsg(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <AuthCard title="Aktywuj konto" subtitle="Wpisz login (PESEL lub e-mail) i kod otrzymany od gminy, a następnie ustaw własne hasło.">
        <form onSubmit={submit} className="space-y-4" data-testid="activate-form">
          <Field label="PESEL lub e-mail"><Input data-testid="activate-login-input" value={f.login} onChange={set("login")} className="h-12 rounded-xl text-base" required /></Field>
          <Field label="Kod aktywacyjny"><Input data-testid="activate-code-input" value={f.code} onChange={set("code")} className="h-12 rounded-xl font-mono-tag text-base uppercase tracking-widest" required /></Field>
          <Field label="Nowe hasło" hint="Co najmniej 8 znaków"><Input data-testid="activate-password-input" type="password" value={f.password} onChange={set("password")} className="h-12 rounded-xl text-base" required /></Field>
          <Field label="Powtórz hasło"><Input data-testid="activate-password2-input" type="password" value={f.password2} onChange={set("password2")} className="h-12 rounded-xl text-base" required /></Field>
          {err && <p data-testid="activate-error" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
          <Button data-testid="activate-submit-button" disabled={busy} className="h-12 w-full rounded-xl text-base">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Ustaw hasło i zaloguj</Button>
        </form>
      </AuthCard>
    </Shell>
  );
}
