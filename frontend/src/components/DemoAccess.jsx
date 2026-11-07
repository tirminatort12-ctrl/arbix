import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, HardHat, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const DEMO = [
  { key: "admin", role: "gmina_admin", label: "Administrator gminy", icon: Building2 },
  { key: "worker", role: "worker", label: "Pracownik", icon: HardHat },
  { key: "resident", role: "resident", label: "Mieszkaniec", icon: User },
];

export default function DemoAccess({ next }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState("");
  const { signIn } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    api.get("/auth/demo").then((r) => setEnabled(r.data.enabled)).catch((e) => console.error("Demo status check failed", e));
  }, []);
  const go = async (d) => {
    setBusy(d.key);
    try {
      await api.post("/auth/demo", { role: d.role });
      await signIn();
      nav(next || "/app", { replace: true });
    } catch (e) {
      toast.error(errMsg(e));
      setBusy("");
    }
  };
  if (!enabled) return null;
  return (
    <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4" data-testid="demo-access">
      <div className="text-sm font-semibold text-[#1B4332]">Szybkie wejście (konta demo)</div>
      <div className="mt-3 grid grid-cols-1 gap-2">
        {DEMO.map((d) => (
          <button key={d.key} type="button" data-testid={`demo-login-${d.key}`} disabled={!!busy} onClick={() => go(d)}
            className="flex min-h-[52px] items-center gap-2 rounded-xl border border-emerald-100 bg-white px-3 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50 disabled:opacity-60">
            {busy === d.key ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <d.icon className="h-4 w-4 shrink-0 text-[#2D6A4F]" />}{d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
