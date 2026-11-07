import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PhotoPicker } from "@/components/Common";
import { api, errMsg } from "@/lib/api";
import { REPORT_TYPES } from "@/lib/labels";

export default function ReportForm({ token, osmId, lat, lng }) {
  const [type, setType] = useState("");
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!type) return toast.error("Wybierz rodzaj problemu");
    if (!files.length) return toast.error("Dodaj co najmniej jedno zdjęcie");
    const fd = new FormData();
    if (token) fd.append("tree_token", token);
    else if (osmId) fd.append("osm_id", osmId);
    else { fd.append("lat", lat); fd.append("lng", lng); }
    fd.append("type", type);
    fd.append("comment", comment);
    files.forEach((f) => fd.append("photos", f));
    setBusy(true);
    try {
      await api.post("/resident/reports", fd);
      setDone(true);
    } catch (e2) {
      toast.error(errMsg(e2));
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div data-testid="report-success" className="rise rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h3 className="mt-3 text-lg font-bold text-[#1B4332]">Dziękujemy za zgłoszenie!</h3>
        <p className="mt-1 text-sm text-slate-600">Pracownicy gminy zajmą się nim. Status sprawdzisz w „Moich zgłoszeniach”.</p>
        <Link to="/zgloszenia" data-testid="report-go-my-reports" className="mt-4 inline-flex h-12 items-center rounded-full bg-[#2D6A4F] px-6 font-semibold text-white">Moje zgłoszenia</Link>
      </div>
    );

  return (
    <form onSubmit={submit} data-testid="report-problem-form" className="space-y-5">
      <div>
        <div className="mb-2 text-sm font-semibold text-slate-700">Co się dzieje z drzewem?</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Object.entries(REPORT_TYPES).map(([k, v]) => (
            <button type="button" key={k} data-testid={`report-type-${k}`} onClick={() => setType(k)}
              className={`min-h-[52px] rounded-xl border px-4 text-left text-sm font-semibold transition-colors ${type === k ? "border-[#2D6A4F] bg-[#2D6A4F] text-white" : "border-emerald-100 bg-white text-slate-700 hover:bg-emerald-50"}`}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold text-slate-700">Komentarz</div>
        <Textarea data-testid="report-comment-input" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={2000}
          placeholder="Np. duża gałąź zwisa nad ścieżką" className="rounded-xl text-base" />
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold text-slate-700">Zdjęcia (1–3)</div>
        <PhotoPicker files={files} setFiles={setFiles} max={3} testId="report-photo-upload-input" label="Zrób / dodaj zdjęcie" />
      </div>
      <Button data-testid="report-submit-button" disabled={busy} className="h-14 w-full rounded-xl text-base">
        {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}Wyślij zgłoszenie
      </Button>
    </form>
  );
}
