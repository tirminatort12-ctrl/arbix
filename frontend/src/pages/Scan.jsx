import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { CameraOff, Hash } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGmina, useMapData } from "@/lib/gmina";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";

const toPath = (text) => {
  try {
    const u = new URL(text);
    if (/^\/(t|w)\/[\w-]+$/.test(u.pathname)) return u.pathname;
  } catch {
    return null; // not a URL, so not an ARBIX code
  }
  return null;
};

const Scanner = ({ onPath }) => {
  const { t } = useT();
  const tRef = useRef(t);
  tRef.current = t;
  const ref = useRef(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    const guard = (e) => { if (/play\(\)|AbortError|media was removed/i.test(String(e.reason?.message || e.reason))) e.preventDefault(); };
    window.addEventListener("unhandledrejection", guard);
    const qr = new Html5Qrcode("qr-reader", { verbose: false });
    ref.current = qr;
    let done = false;
    const started = qr.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 230, height: 230 } }, (text) => {
      const p = toPath(text);
      if (!p) return toast.error(tRef.current("notArbix"));
      if (done) return;
      done = true;
      onPath(p);
    }, () => {}).catch((e) => { console.error("Camera start failed", e); setErr(tRef.current("noCamera")); });
    return () => {
      started.then(() => qr.isScanning && qr.stop()).then(() => qr.clear()).catch(() => {})
        .finally(() => setTimeout(() => window.removeEventListener("unhandledrejection", guard), 1000));
    };
  }, [onPath]);
  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900" data-testid="qr-scanner">
      <div id="qr-reader" className="aspect-square w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
      {err && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white" data-testid="qr-scanner-error">
          <div><CameraOff className="mx-auto mb-3 h-10 w-10 text-emerald-200" />{err}</div>
        </div>
      )}
    </div>
  );
};

export default function Scan() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { t: tr } = useT();
  const go = useCallback((p) => nav(p.startsWith("/t/") ? `/?tree=${p.slice(3)}` : p), [nav]);
  const { gid } = useGmina();
  const data = useMapData(gid);
  const [tag, setTag] = useState("");
  const find = (e) => {
    e.preventDefault();
    const t = (data?.trees || []).find((x) => x.tag_number.toLowerCase() === tag.trim().toLowerCase());
    if (!t) return toast.error(tr("noTag"));
    nav(`/?tree=${t.public_token}`);
  };
  return (
    <AppShell title={tr("scanTitle")}>
      <div className="space-y-5" data-testid="scan-page">
        <p className="text-sm text-slate-600">{tr(user ? "scanStaff" : "scanGuest")}</p>
        <Scanner onPath={go} />
        <form onSubmit={find} className="rounded-3xl border border-emerald-100 bg-white p-5" data-testid="scan-tag-form">
          <div className="flex items-center gap-2 font-semibold text-slate-800"><Hash className="h-4 w-4 text-[#2D6A4F]" />{tr("orTag")}</div>
          <div className="mt-3 flex gap-2">
            <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="np. ZP-0001" data-testid="scan-tag-input" className="h-12 rounded-xl font-mono-tag uppercase" />
            <Button type="submit" disabled={!data} data-testid="scan-tag-submit" className="h-12 rounded-xl bg-[#2D6A4F] px-5 hover:bg-[#1B4332]">{tr("find")}</Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
