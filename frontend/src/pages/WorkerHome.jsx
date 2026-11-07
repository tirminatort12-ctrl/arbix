import { ServiceUnavailable } from "@/components/Common";
import TreeList from "@/components/TreeList";
import { WorkerTabs } from "@/components/ReportsQueue";
import { useAuth } from "@/lib/auth";

export default function WorkerHome() {
  const { user, gmina } = useAuth();
  return (
    <div className="space-y-6" data-testid="worker-home">
      <div className="rise">
        <p className="text-sm text-slate-500">{gmina?.name} · Pracownik</p>
        <h1 className="text-3xl font-extrabold text-[#1B4332] sm:text-4xl">Cześć, {user.first_name}!</h1>
        <p className="mt-1 text-sm text-slate-600">Zeskanuj <b>kod QR</b> na tabliczce — otworzy się karta służbowa drzewa. Możesz też wybrać drzewo z listy.</p>
      </div>
      {gmina && !gmina.subscription.active ? <ServiceUnavailable /> : <WorkerTabs treesTab={<TreeList />} />}
    </div>
  );
}
