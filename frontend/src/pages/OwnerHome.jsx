import { useCallback, useEffect, useState } from "react";
import { Building2, KeyRound, Loader2, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CodeDialog, Field, Spinner, StatCard } from "@/components/Common";
import { SubBadge } from "@/components/Badges";
import { api, errMsg, fmtDate } from "@/lib/api";
import { PLAN_NAMES } from "@/lib/labels";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const UntilPicker = ({ id, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(`${value}T12:00:00`) : undefined;
  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger data-testid={`owner-manual-until-${id}`} title="Do kiedy (puste = bezterminowo)" className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-white px-3 text-sm">
          <CalendarDays className="h-4 w-4 text-[#2D6A4F]" />{date ? format(date, "dd.MM.yyyy") : "Bezterminowo"}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto bg-white p-0">
          <Calendar mode="single" locale={pl} weekStartsOn={1} selected={date} disabled={{ before: new Date() }} onSelect={(d) => { onChange(d ? format(d, "yyyy-MM-dd") : ""); setOpen(false); }} initialFocus />
        </PopoverContent>
      </Popover>
      {value && <button type="button" onClick={() => onChange("")} aria-label="Bezterminowo" data-testid={`owner-manual-until-clear-${id}`} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
    </div>
  );
};

const NewGminaDialog = ({ open, onClose, onCreated }) => {
  const [f, setF] = useState({ name: "", plan: "mala", admin_email: "", admin_first_name: "", admin_last_name: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/owner/gminas", f);
      onCreated({ login: data.admin_login, code: data.activation_code });
      setF({ name: "", plan: "mala", admin_email: "", admin_first_name: "", admin_last_name: "" });
    } catch (e2) { toast.error(errMsg(e2)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-white" data-testid="new-gmina-dialog">
        <DialogHeader><DialogTitle className="font-display">Nowa gmina</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Nazwa gminy"><Input data-testid="new-gmina-name" value={f.name} onChange={set("name")} className="h-11 rounded-xl" required /></Field>
          <Field label="Pakiet">
            <Select value={f.plan} onValueChange={(v) => setF({ ...f, plan: v })}>
              <SelectTrigger data-testid="new-gmina-plan" className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">{Object.entries(PLAN_NAMES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="E-mail administratora gminy"><Input data-testid="new-gmina-admin-email" type="email" value={f.admin_email} onChange={set("admin_email")} className="h-11 rounded-xl" required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Imię"><Input data-testid="new-gmina-admin-first" value={f.admin_first_name} onChange={set("admin_first_name")} className="h-11 rounded-xl" required /></Field>
            <Field label="Nazwisko"><Input data-testid="new-gmina-admin-last" value={f.admin_last_name} onChange={set("admin_last_name")} className="h-11 rounded-xl" required /></Field>
          </div>
          <p className="text-xs text-slate-500">Gmina otrzyma 14 dni okresu próbnego.</p>
          <Button data-testid="new-gmina-submit" disabled={busy} className="h-12 w-full rounded-xl">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Utwórz gminę</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const AddAdmin = ({ gid, onCode }) => {
  const [f, setF] = useState({ email: "", first_name: "", last_name: "" });
  const [open, setOpen] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    try { const { data } = await api.post(`/owner/gminas/${gid}/admins`, f); onCode({ login: data.admin_login, code: data.activation_code }); setOpen(false); setF({ email: "", first_name: "", last_name: "" }); }
    catch (e2) { toast.error(errMsg(e2)); }
  };
  if (!open) return <Button size="sm" variant="ghost" data-testid={`owner-add-admin-${gid}`} onClick={() => setOpen(true)} className="h-9 rounded-full"><UserPlus className="mr-1 h-3.5 w-3.5" />Dodaj administratora</Button>;
  return (
    <form onSubmit={submit} className="grid gap-2 sm:grid-cols-4">
      <Input data-testid={`owner-admin-email-${gid}`} type="email" placeholder="E-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="h-10 rounded-lg" required />
      <Input placeholder="Imię" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} className="h-10 rounded-lg" required />
      <Input placeholder="Nazwisko" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} className="h-10 rounded-lg" required />
      <Button data-testid={`owner-admin-submit-${gid}`} className="h-10 rounded-lg">Dodaj</Button>
    </form>
  );
};

const GminaCard = ({ g, onUpdate, onCode }) => {
  const [until, setUntil] = useState(g.manual_until?.slice(0, 10) || "");
  const patch = async (body) => {
    try { await api.patch(`/owner/gminas/${g.id}`, body); toast.success("Zapisano"); onUpdate(); } catch (e) { toast.error(errMsg(e)); }
  };
  const manualOn = g.manual === "on";
  const disabled = g.manual === "off";
  const reset = async (a) => {
    try { const { data } = await api.post(`/owner/users/${a.id}/reset`); onCode({ login: data.admin_login, code: data.activation_code }); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="rise rounded-2xl border border-emerald-100 bg-white p-5" data-testid={`owner-gmina-${g.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-display text-lg font-bold text-slate-800">{g.name}</div>
          <div className="text-xs text-slate-500">{g.trees} drzew · {g.users} użytkowników · od {fmtDate(g.created_at)}</div>
        </div>
        <div className="text-right">
          <SubBadge value={g.subscription.status} testId={`owner-gmina-status-${g.id}`} />
          <div className="mt-1 text-xs text-slate-500">{g.subscription.until ? `do ${fmtDate(g.subscription.until)}` : ""}{g.paid_until && g.subscription.status !== "card" ? ` · kartą do ${fmtDate(g.paid_until)}` : ""}</div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 border-t border-emerald-50 pt-4 md:grid-cols-3">
        <Field label="Pakiet">
          <Select value={g.plan} onValueChange={(v) => patch({ plan: v })}>
            <SelectTrigger data-testid={`owner-gmina-plan-${g.id}`} className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white">{Object.entries(PLAN_NAMES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <div className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Włączona ręcznie</span>
          <div className="flex items-center gap-2">
            <Switch data-testid={`owner-gmina-toggle-switch-${g.id}`} checked={manualOn} onCheckedChange={(v) => { if (!v) setUntil(""); patch({ manual: v ? "on" : "auto", manual_until: v && until ? `${until}T23:59:59+00:00` : null }); }} />
            <UntilPicker id={g.id} value={until} onChange={(v) => { setUntil(v); if (manualOn) patch({ manual: "on", manual_until: v ? `${v}T23:59:59+00:00` : null }); }} />
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Wyłącz dostęp</span>
          <div className="flex items-center gap-2"><Switch data-testid={`owner-gmina-disable-${g.id}`} checked={disabled} onCheckedChange={(v) => patch({ manual: v ? "off" : "auto" })} /><span className="text-xs text-slate-500">{disabled ? "Gmina wyłączona" : "Dostęp wg płatności"}</span></div>
        </div>
      </div>
      <div className="mt-4 space-y-2 border-t border-emerald-50 pt-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Administratorzy</div>
        {g.admins.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-slate-700">{a.first_name} {a.last_name}</span><span className="text-slate-500">{a.email}</span>
            <span className="text-xs text-slate-400">{a.status === "invited" ? "(nieaktywowany)" : ""}</span>
            <Button size="sm" variant="outline" data-testid={`owner-admin-reset-${a.id}`} onClick={() => reset(a)} className="h-8 rounded-full"><KeyRound className="mr-1 h-3 w-3" />Nowy kod</Button>
          </div>
        ))}
        <AddAdmin gid={g.id} onCode={onCode} />
      </div>
    </div>
  );
};

export default function OwnerHome() {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(null);
  const load = useCallback(() => api.get("/owner/gminas").then((r) => setList(r.data)), []);
  useEffect(() => { load(); }, [load]);
  if (!list) return <Spinner />;
  const active = list.filter((g) => g.subscription.active).length;

  return (
    <div className="space-y-6" data-testid="owner-home">
      <div className="rise flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Panel właściciela platformy</p>
          <h1 className="text-3xl font-extrabold text-[#1B4332] sm:text-4xl">Gminy</h1>
        </div>
        <Button data-testid="owner-new-gmina-button" onClick={() => setOpen(true)} className="h-12 rounded-full px-6"><Plus className="mr-1 h-4 w-4" />Nowa gmina</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Gminy" value={list.length} icon={Building2} testId="owner-stat-gminas" />
        <StatCard label="Aktywne" value={active} testId="owner-stat-active" />
        <StatCard label="Opłacone kartą" value={list.filter((g) => g.subscription.status === "card").length} testId="owner-stat-card" />
        <StatCard label="Drzewa łącznie" value={list.reduce((s, g) => s + g.trees, 0)} testId="owner-stat-trees" />
      </div>
      <div className="space-y-4" data-testid="owner-gminas-list">
        {list.map((g) => <GminaCard key={g.id} g={g} onUpdate={load} onCode={setCode} />)}
      </div>
      <NewGminaDialog open={open} onClose={() => setOpen(false)} onCreated={(c) => { setOpen(false); setCode(c); load(); }} />
      <CodeDialog info={code} onClose={() => setCode(null)} />
    </div>
  );
}
