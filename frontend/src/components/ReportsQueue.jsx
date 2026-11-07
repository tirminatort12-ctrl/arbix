import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/Common";
import { ReportCard } from "@/components/ReportCard";
import { api } from "@/lib/api";

const FILTERS = [["open", "Otwarte"], ["new", "Nowe"], ["in_progress", "W trakcie"], ["done", "Zrealizowane"], ["rejected", "Odrzucone"]];

export default function ReportsQueue() {
  const [status, setStatus] = useState("open");
  const [items, setItems] = useState(null);
  const nav = useNavigate();
  const load = useCallback(() => api.get("/staff/reports", { params: { status } }).then((r) => setItems(r.data)).catch(() => setItems([])), [status]);
  useEffect(() => { setItems(null); load(); }, [load]);

  return (
    <div className="space-y-4" data-testid="reports-queue">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(([k, l]) => (
          <button key={k} data-testid={`reports-filter-${k}`} onClick={() => setStatus(k)}
            className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors ${status === k ? "border-[#2D6A4F] bg-[#2D6A4F] text-white" : "border-emerald-100 bg-white text-slate-600 hover:bg-emerald-50"}`}>{l}</button>
        ))}
      </div>
      {!items ? <Spinner /> : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-emerald-200 bg-white p-6 text-center text-sm text-slate-500" data-testid="reports-empty">Brak zgłoszeń.</p>
      ) : items.map((r) => <ReportCard key={r.id} r={r} onChange={load} showTree onOpenTree={() => nav(`/staff/trees/${r.tree_id}`)} />)}
    </div>
  );
}

export const WorkerTabs = ({ treesTab }) => (
  <Tabs defaultValue="reports" className="w-full">
    <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl bg-emerald-50 p-1">
      <TabsTrigger value="reports" data-testid="worker-tab-reports" className="rounded-lg">Zgłoszenia</TabsTrigger>
      <TabsTrigger value="trees" data-testid="worker-tab-trees" className="rounded-lg">Drzewa</TabsTrigger>
    </TabsList>
    <TabsContent value="reports" className="mt-4"><ReportsQueue /></TabsContent>
    <TabsContent value="trees" className="mt-4">{treesTab}</TabsContent>
  </Tabs>
);
