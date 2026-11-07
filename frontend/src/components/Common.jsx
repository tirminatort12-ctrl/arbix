import { useEffect, useState } from "react";
import { AlertTriangle, Copy, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fileUrl } from "@/lib/api";

export const Spinner = ({ label = "Ładowanie…" }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-slate-500" data-testid="loading-spinner">
    <Loader2 className="h-5 w-5 animate-spin" /> {label}
  </div>
);

export const ServiceUnavailable = ({ text }) => (
  <div data-testid="service-unavailable" className="rise rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
    <div className="flex items-center gap-2 font-display text-lg font-bold"><AlertTriangle className="h-5 w-5" /> Serwis tymczasowo niedostępny</div>
    <p className="mt-2 text-sm leading-relaxed">{text || "Subskrypcja gminy jest nieaktywna. Dane są bezpieczne — dostęp wróci po odnowieniu subskrypcji przez gminę."}</p>
  </div>
);

export const StatCard = ({ label, value, icon: Icon, testId }) => (
  <div data-testid={testId} className="rise rounded-2xl border border-emerald-100 bg-white p-5">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {Icon && <Icon className="h-5 w-5 text-emerald-600" />}
    </div>
    <div className="mt-2 font-display text-3xl font-bold text-slate-800">{value}</div>
  </div>
);

export const CodeDialog = ({ info, onClose }) => {
  const copy = () => { navigator.clipboard?.writeText(info.code); toast.success("Skopiowano kod"); };
  return (
    <Dialog open={!!info} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-white" data-testid="activation-code-dialog">
        <DialogHeader>
          <DialogTitle className="font-display">Kod aktywacyjny</DialogTitle>
          <DialogDescription>Przekaż te dane osobie. Kod jest pokazywany tylko raz — przy pierwszym logowaniu ustawi ona własne hasło na stronie „Aktywuj konto”.</DialogDescription>
        </DialogHeader>
        {info && (
          <div className="space-y-3">
            <div className="rounded-xl bg-emerald-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Login</div>
              <div className="font-mono-tag text-slate-800" data-testid="activation-login">{info.login}</div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Kod</div>
              <div className="font-mono-tag text-3xl font-bold tracking-widest text-[#1B4332]" data-testid="activation-code-value">{info.code}</div>
            </div>
            <Button data-testid="copy-activation-code-button" variant="outline" className="h-12 w-full rounded-xl" onClick={copy}><Copy className="mr-2 h-4 w-4" />Kopiuj kod</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const PhotoPicker = ({ files, setFiles, max = 3, testId = "photo-upload-input", label = "Dodaj zdjęcie" }) => {
  const [previews, setPreviews] = useState([]);
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);
  const add = (e) => {
    const picked = Array.from(e.target.files || []);
    setFiles([...files, ...picked].slice(0, max));
    e.target.value = "";
  };
  return (
    <div className="grid grid-cols-3 gap-3">
      {previews.map((u, i) => (
        <div key={u} className="relative aspect-square overflow-hidden rounded-xl border border-emerald-100">
          <img src={u} alt="" className="h-full w-full object-cover" />
          <button type="button" data-testid={`${testId}-remove-${i}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}
            className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-slate-700 shadow"><X className="h-4 w-4" /></button>
        </div>
      ))}
      {files.length < max && (
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 text-center text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50">
          <ImagePlus className="h-6 w-6" />{label}
          <input data-testid={testId} type="file" accept="image/*" multiple className="hidden" onChange={add} />
        </label>
      )}
    </div>
  );
};

export const PhotoStrip = ({ paths = [], testId = "photo-strip" }) => {
  const [open, setOpen] = useState(null);
  if (!paths.length) return null;
  return (
    <>
      <div className="flex flex-wrap gap-2" data-testid={testId}>
        {paths.map((p) => (
          <button key={p} type="button" onClick={() => setOpen(p)} className="h-20 w-20 overflow-hidden rounded-lg border border-emerald-100">
            <img src={fileUrl(p)} alt="" loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl bg-white p-2">
          <DialogTitle className="sr-only">Zdjęcie</DialogTitle>
          {open && <img src={fileUrl(open)} alt="" className="max-h-[80vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </>
  );
};

export const Field = ({ label, children, hint }) => (
  <label className="block space-y-1.5">
    <span className="text-sm font-semibold text-slate-700">{label}</span>
    {children}
    {hint && <span className="block text-xs text-slate-500">{hint}</span>}
  </label>
);
