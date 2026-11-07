import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ClipboardList, TreeDeciduous, UserCheck, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner, StatCard } from "@/components/Common";
import { SubBadge } from "@/components/Badges";
import ReportsQueue from "@/components/ReportsQueue";
import TreesTab from "@/components/admin/TreesTab";
import ParksTab from "@/components/admin/ParksTab";
import WorkersTab from "@/components/admin/WorkersTab";
import ResidentsTab from "@/components/admin/ResidentsTab";
import SubscriptionTab from "@/components/admin/SubscriptionTab";
import ContentTab from "@/components/admin/ContentTab";
import SpeciesTab from "@/components/admin/SpeciesTab";
import { api } from "@/lib/api";

const TABS = [["trees", "Drzewa"], ["reports", "Zgłoszenia"], ["parks", "Parki"], ["places", "Atrakcje"], ["news", "Aktualności"], ["species", "Gatunki"], ["workers", "Pracownicy"], ["residents", "Mieszkańcy"], ["subscription", "Subskrypcja"]];

export default function AdminHome() {
  const [o, setO] = useState(null);
  const [tab, setTab] = useState("trees");
  const load = useCallback(() => api.get("/gmina/overview").then((r) => setO(r.data)), []);
  useEffect(() => { load(); }, [load]);
  if (!o) return <Spinner />;
  const sub = o.gmina.subscription;

  return (
    <div className="space-y-6" data-testid="admin-home">
      <div className="rise flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Panel administratora gminy</p>
          <h1 className="text-3xl font-extrabold text-[#1B4332] sm:text-4xl" data-testid="admin-gmina-name">{o.gmina.name}</h1>
        </div>
        <button onClick={() => setTab("subscription")} className="flex items-center gap-2" data-testid="admin-subscription-shortcut">
          <SubBadge value={sub.status} testId="admin-header-subscription" />
        </button>
      </div>
      {!sub.active && (
        <div data-testid="admin-inactive-banner" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />Subskrypcja nieaktywna — mieszkańcy i pracownicy nie mają dostępu. Opłać subskrypcję w zakładce „Subskrypcja”.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Drzewa" value={o.trees} icon={TreeDeciduous} testId="stat-trees" />
        <StatCard label="Otwarte zgłoszenia" value={o.open_reports} icon={ClipboardList} testId="stat-open-reports" />
        <StatCard label="Mieszkańcy" value={o.residents} icon={Users} testId="stat-residents" />
        <button onClick={() => setTab("residents")} className="text-left"><StatCard label="Do zatwierdzenia" value={o.pending} icon={UserCheck} testId="stat-pending" /></button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-emerald-50 p-1">
          {TABS.map(([k, l]) => <TabsTrigger key={k} value={k} data-testid={`admin-tab-${k}`} className="h-10 shrink-0 rounded-lg px-4">{l}{k === "residents" && o.pending > 0 ? ` (${o.pending})` : ""}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="trees" className="mt-5"><TreesTab onChanged={load} /></TabsContent>
        <TabsContent value="reports" className="mt-5"><ReportsQueue /></TabsContent>
        <TabsContent value="parks" className="mt-5"><ParksTab /></TabsContent>
        <TabsContent value="places" className="mt-5"><ContentTab kind="places" /></TabsContent>
        <TabsContent value="news" className="mt-5"><ContentTab kind="news" /></TabsContent>
        <TabsContent value="species" className="mt-5"><SpeciesTab /></TabsContent>
        <TabsContent value="workers" className="mt-5"><WorkersTab /></TabsContent>
        <TabsContent value="residents" className="mt-5"><ResidentsTab onChanged={load} /></TabsContent>
        <TabsContent value="subscription" className="mt-5"><SubscriptionTab overview={o} /></TabsContent>
      </Tabs>
    </div>
  );
}
