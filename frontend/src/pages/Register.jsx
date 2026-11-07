import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import Shell from "@/components/Shell";
import { Field } from "@/components/Common";
import { AuthCard } from "@/pages/Login";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, errMsg, validPesel } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const STEPS = ["Gmina", "PESEL", "Dane", "Hasło"];

const Stepper = ({ step }) => (
  <div className="mb-6 flex items-center gap-2" data-testid="register-stepper">
    {STEPS.map((s, i) => (
      <div key={s} className="flex flex-1 flex-col gap-1">
        <div className={`h-1.5 rounded-full transition-colors ${i <= step ? "bg-[#2D6A4F]" : "bg-emerald-100"}`} />
        <span className={`text-[11px] font-semibold ${i === step ? "text-[#1B4332]" : "text-slate-400"}`}>{i + 1}. {s}</span>
      </div>
    ))}
  </div>
);

export default function Register() {
  const [gminas, setGminas] = useState([]);
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ gmina_id: "", pesel: "", first_name: "", last_name: "", address: "", password: "", password2: "" });
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuth();
  const nav = useNavigate();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => { api.get("/public/gminas").then((r) => setGminas(r.data)).catch(() => {}); }, []);

  const validate = () => {
    if (step === 0 && !f.gmina_id) return "Wybierz swoją gminę";
    if (step === 1 && !validPesel(f.pesel.trim())) return "Nieprawidłowy numer PESEL — sprawdź cyfry";
    if (step === 2 && (!f.first_name.trim() || !f.last_name.trim() || f.address.trim().length < 3)) return "Uzupełnij imię, nazwisko i adres";
    if (step === 3) {
      if (f.password.length < 8) return "Hasło musi mieć co najmniej 8 znaków";
      if (f.password !== f.password2) return "Hasła nie są identyczne";
      if (!consent) return "Zaznacz zgodę na przetwarzanie danych";
    }
    return "";
  };

  const next = async (e) => {
    e.preventDefault();
    const v = validate();
    setErr(v);
    if (v) return;
    if (step < 3) return setStep(step + 1);
    setBusy(true);
    try {
      const { password2, ...body } = f;
      const { data } = await api.post("/auth/register", { ...body, pesel: f.pesel.trim() });
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
      <AuthCard title="Rejestracja mieszkańca" subtitle="Konto mogą założyć tylko mieszkańcy gminy. Dalsze logowanie: PESEL + hasło.">
        <Stepper step={step} />
        <form onSubmit={next} className="space-y-4" data-testid="register-form">
          {step === 0 && (
            <Field label="Twoja gmina">
              <Select value={f.gmina_id} onValueChange={(v) => setF({ ...f, gmina_id: v })}>
                <SelectTrigger data-testid="register-gmina-select" className="h-12 rounded-xl text-base"><SelectValue placeholder="Wybierz gminę" /></SelectTrigger>
                <SelectContent className="bg-white">
                  {gminas.map((g) => <SelectItem key={g.id} value={g.id} data-testid={`register-gmina-option-${g.id}`}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          {step === 1 && (
            <Field label="Numer PESEL" hint="Numer jest przechowywany w formie zaszyfrowanej i nie jest widoczny dla innych.">
              <Input data-testid="register-pesel-input" value={f.pesel} onChange={set("pesel")} inputMode="numeric" maxLength={11} className="h-12 rounded-xl font-mono-tag text-lg tracking-widest" />
            </Field>
          )}
          {step === 2 && (
            <>
              <Field label="Imię"><Input data-testid="register-first-name-input" value={f.first_name} onChange={set("first_name")} className="h-12 rounded-xl text-base" /></Field>
              <Field label="Nazwisko"><Input data-testid="register-last-name-input" value={f.last_name} onChange={set("last_name")} className="h-12 rounded-xl text-base" /></Field>
              <Field label="Adres zamieszkania"><Input data-testid="register-address-input" value={f.address} onChange={set("address")} placeholder="ul. Lipowa 5, Miejscowość" className="h-12 rounded-xl text-base" /></Field>
            </>
          )}
          {step === 3 && (
            <>
              <Field label="Hasło" hint="Co najmniej 8 znaków"><Input data-testid="register-password-input" type="password" value={f.password} onChange={set("password")} className="h-12 rounded-xl text-base" /></Field>
              <Field label="Powtórz hasło"><Input data-testid="register-password2-input" type="password" value={f.password2} onChange={set("password2")} className="h-12 rounded-xl text-base" /></Field>
              <label className="flex items-start gap-3 rounded-xl bg-emerald-50 p-3 text-xs leading-relaxed text-slate-700">
                <Checkbox data-testid="register-consent-checkbox" checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />
                Wyrażam zgodę na przetwarzanie moich danych osobowych przez gminę w celu obsługi zgłoszeń dotyczących zieleni (RODO).
              </label>
            </>
          )}
          {err && <p data-testid="register-error" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
          <div className="flex gap-3">
            {step > 0 && <Button type="button" variant="outline" data-testid="register-wizard-back" onClick={() => { setErr(""); setStep(step - 1); }} className="h-12 flex-1 rounded-xl">Wstecz</Button>}
            <Button data-testid={step < 3 ? "register-wizard-next-step" : "register-wizard-submit-button"} disabled={busy} className="h-12 flex-[2] rounded-xl text-base">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : step === 3 && <Check className="mr-2 h-4 w-4" />}
              {step < 3 ? "Dalej" : "Załóż konto"}
            </Button>
          </div>
        </form>
        <p className="mt-6 text-sm text-slate-600">Masz już konto? <Link to="/login" data-testid="register-login-link" className="font-semibold text-[#2D6A4F] hover:underline">Zaloguj się</Link></p>
      </AuthCard>
    </Shell>
  );
}
