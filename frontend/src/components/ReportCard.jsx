import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReportBadge } from "@/components/Badges";
import { PhotoStrip } from "@/components/Common";
import { api, errMsg, fmtDate } from "@/lib/api";
import { REPORT_TYPES } from "@/lib/labels";

const NEXT = {
  new: [["in_progress", "Przyjmij do realizacji"], ["rejected", "Odrzuć"]],
  in_progress: [["done", "Oznacz jako zrealizowane"], ["rejected", "Odrzuć"]],
  done: [["in_progress", "Otwórz ponownie"]],
  rejected: [["in_progress", "Otwórz ponownie"]],
};

export const ReportCard = ({ r, onChange, showTree, onOpenTree }) => {
  const [note, setNote] = useState(r.staff_note || "");
  const [busy, setBusy] = useState("");
  const change = async (status) => {
    setBusy(status);
    try {
      await api.patch(`/staff/reports/${r.id}`, { status, staff_note: note });
      toast.success("Zaktualizowano zgłoszenie");
      onChange?.();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="rise rounded-2xl border border-emerald-100 bg-white p-4" data-testid={`report-card-${r.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-slate-800">{REPORT_TYPES[r.type]}</div>
        <ReportBadge value={r.status} testId={`report-status-${r.id}`} />
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {showTree && r.tree_id && <button type="button" onClick={onOpenTree} data-testid={`report-open-tree-${r.id}`} className="font-mono-tag mr-2 font-semibold text-[#2D6A4F] hover:underline">{r.tree_tag} · {r.tree_species}</button>}
        {!r.tree_id && r.lat != null && (
          <a href={`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`} target="_blank" rel="noreferrer" data-testid={`report-location-${r.id}`} className="mr-2 font-semibold text-[#2D6A4F] hover:underline">
            {r.osm_id ? `Drzewo spoza rejestru (OSM ${r.osm_id})${r.osm_species ? ` · ${r.osm_species}` : ""}` : "Miejsce zdarzenia"} · {Number(r.lat).toFixed(5)}, {Number(r.lng).toFixed(5)}
          </a>
        )}
        {r.resident_name} · {fmtDate(r.created_at)}
      </div>
      {r.comment && <p className="mt-2 text-sm text-slate-700">{r.comment}</p>}
      <div className="mt-3"><PhotoStrip paths={r.photos} testId={`report-photos-${r.id}`} /></div>
      {onChange && (
        <div className="mt-3 space-y-2">
          <Textarea data-testid={`report-note-${r.id}`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Notatka dla mieszkańca (opcjonalnie)" className="rounded-xl text-sm" />
          <div className="flex flex-wrap gap-2">
            {NEXT[r.status].map(([s, l]) => (
              <Button key={s} size="sm" variant={s === "rejected" ? "outline" : "default"} disabled={!!busy} data-testid={`report-action-${s}-${r.id}`} onClick={() => change(s)} className="h-10 rounded-full px-4">
                {busy === s && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}{l}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
