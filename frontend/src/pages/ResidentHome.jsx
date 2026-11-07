import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { Spinner, ServiceUnavailable, PhotoStrip } from "@/components/Common";
import { ReportBadge } from "@/components/Badges";
import { api, fmtDate } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { REPORT_TYPES } from "@/lib/labels";

const ReportPlace = ({ r }) => {
  if (r.tree?.public_token) return <Link to={`/t/${r.tree.public_token}`} className="font-mono-tag font-semibold text-[#2D6A4F] hover:underline">{r.tree.tag_number} · {r.tree.species}</Link>;
  if (r.lat == null) return "—";
  return <span data-testid={`my-report-place-${r.id}`}>{r.osm_id ? "Drzewo z OpenStreetMap" : "Miejsce zdarzenia"} · {Number(r.lat).toFixed(4)}, {Number(r.lng).toFixed(4)}</span>;
};

const ReportsBody = ({ reports }) => {
  if (!reports) return <Spinner />;
  if (reports.length === 0) return (
        <div data-testid="my-reports-empty" className="rounded-3xl border border-dashed border-emerald-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">Nie masz jeszcze żadnych zgłoszeń.</p>
          <Link to="/skanuj" data-testid="my-reports-scan" className="mt-4 inline-flex h-11 items-center rounded-full bg-[#2D6A4F] px-6 text-sm font-semibold text-white">Zeskanuj kod drzewa</Link>
        </div>
  );
  return (
        <div className="space-y-3" data-testid="my-reports-list">
          {reports.map((r) => (
            <div key={r.id} className="rise rounded-3xl border border-emerald-100 bg-white p-4" data-testid={`my-report-${r.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-slate-800">{REPORT_TYPES[r.type]}</div>
                <ReportBadge value={r.status} testId={`my-report-status-${r.id}`} />
              </div>
              <div className="mt-1 text-xs text-slate-500">
                <ReportPlace r={r} /> · {fmtDate(r.created_at)}
              </div>
              {r.comment && <p className="mt-2 text-sm text-slate-700">{r.comment}</p>}
              <div className="mt-2"><PhotoStrip paths={r.photos} /></div>
              {r.staff_note && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-[#1B4332]"><b>Odpowiedź gminy:</b> {r.staff_note}</p>}
            </div>
          ))}
        </div>
  );
};

export default function ResidentHome() {
  const { user, gmina } = useAuth();
  const [reports, setReports] = useState(null);
  useEffect(() => { api.get("/resident/reports").then((r) => setReports(r.data)).catch(() => setReports([])); }, []);

  return (
    <div className="space-y-4" data-testid="resident-home">
      {user.status === "pending" && (
        <div data-testid="resident-pending-banner" className="rise flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <Clock className="h-5 w-5 shrink-0" />
          <p className="text-sm">Twoja rejestracja czeka na zatwierdzenie przez administratora gminy. Do tego czasu możesz przeglądać informacje o drzewach, ale nie możesz wysyłać zgłoszeń.</p>
        </div>
      )}
      {gmina && !gmina.subscription.active && <ServiceUnavailable />}
      <ReportsBody reports={reports} />
    </div>
  );
}
