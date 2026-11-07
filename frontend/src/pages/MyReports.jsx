import { Link, Navigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Spinner } from "@/components/Common";
import ResidentHome from "@/pages/ResidentHome";
import { useAuth } from "@/lib/auth";

export default function MyReports() {
  const { loading, user } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/profil" replace />;
  if (user.role !== "resident") return <Navigate to="/app" replace />;
  return (
    <AppShell title="Moje zgłoszenia">
      {user ? <ResidentHome /> : (
        <div className="rounded-3xl border border-emerald-100 bg-white p-6 text-center" data-testid="reports-guest">
          <ClipboardList className="mx-auto h-10 w-10 text-[#74C69D]" />
          <p className="mt-3 font-semibold text-slate-800">Zaloguj się, aby zobaczyć swoje zgłoszenia</p>
          <Link to="/login?next=/zgloszenia" data-testid="reports-guest-login" className="mt-4 inline-flex h-11 items-center rounded-full bg-[#2D6A4F] px-6 text-sm font-semibold text-white">Zaloguj się</Link>
        </div>
      )}
    </AppShell>
  );
}
