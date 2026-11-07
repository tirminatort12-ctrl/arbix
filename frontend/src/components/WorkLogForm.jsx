import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, PhotoPicker } from "@/components/Common";
import { api, errMsg } from "@/lib/api";
import { WORK_TYPES, CONDITIONS } from "@/lib/labels";

export default function WorkLogForm({ tree, reports, onSaved }) {
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), type: "inspection", description: "", new_condition: "keep", report_id: "none" });
  const [before, setBefore] = useState([]);
  const [after, setAfter] = useState([]);
  const [busy, setBusy] = useState(false);
  const open = reports.filter((r) => ["new", "in_progress"].includes(r.status));

  const submit = async (e) => {
    e.preventDefault();
    if (before.length + after.length > 5) return toast.error("Maksymalnie 5 zdjęć łącznie");
    const fd = new FormData();
    fd.append("date", f.date);
    fd.append("type", f.type);
    fd.append("description", f.description);
    fd.append("new_condition", f.new_condition === "keep" ? "" : f.new_condition);
    fd.append("report_id", f.report_id === "none" ? "" : f.report_id);
    before.forEach((x) => fd.append("photos_before", x));
    after.forEach((x) => fd.append("photos_after", x));
    setBusy(true);
    try {
      await api.post(`/staff/trees/${tree.id}/logs`, fd);
      toast.success("Zapisano wpis w historii");
      onSaved();
    } catch (e2) {
      toast.error(errMsg(e2));
    } finally {
      setBusy(false);
    }
  };

  const sel = (k, opts, testId) => (
    <Select value={f[k]} onValueChange={(v) => setF({ ...f, [k]: v })}>
      <SelectTrigger data-testid={testId} className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
      <SelectContent className="bg-white">{opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
    </Select>
  );

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="work-log-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data"><Input data-testid="work-log-date-input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="h-12 rounded-xl" required /></Field>
        <Field label="Rodzaj pracy">{sel("type", Object.entries(WORK_TYPES), "work-log-type-select")}</Field>
      </div>
      <Field label="Opis"><Textarea data-testid="work-log-description-input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} className="rounded-xl" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nowy stan drzewa">{sel("new_condition", [["keep", "Bez zmian"], ...Object.entries(CONDITIONS).map(([k, v]) => [k, v.label])], "work-log-condition-select")}</Field>
        <Field label="Zamyka zgłoszenie">{sel("report_id", [["none", "Nie dotyczy"], ...open.map((r) => [r.id, `${r.resident_name} · ${new Date(r.created_at).toLocaleDateString("pl-PL")}`])], "work-log-report-select")}</Field>
      </div>
      <Field label="Zdjęcia przed"><PhotoPicker files={before} setFiles={setBefore} max={Math.max(0, 5 - after.length) || before.length} testId="work-log-photos-before" label="Przed" /></Field>
      <Field label="Zdjęcia po"><PhotoPicker files={after} setFiles={setAfter} max={Math.max(0, 5 - before.length) || after.length} testId="work-log-photos-after" label="Po" /></Field>
      <Button data-testid="work-log-submit-button" disabled={busy} className="h-12 w-full rounded-xl text-base">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Zapisz wpis</Button>
    </form>
  );
}
