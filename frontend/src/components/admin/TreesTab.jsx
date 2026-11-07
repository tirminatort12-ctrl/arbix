import { useEffect, useState } from "react";
import { Download, Loader2, Pencil, Plus, QrCode, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import TreeList from "@/components/TreeList";
import TreeFormDialog from "@/components/admin/TreeFormDialog";
import { api, downloadBlob, errMsg } from "@/lib/api";

const origin = () => encodeURIComponent(window.location.origin);
const IconBtn = ({ onClick, testId, label, children }) => (
  <button type="button" onClick={onClick} data-testid={testId} aria-label={label} title={label}
    className="grid h-10 w-10 place-items-center rounded-full text-slate-500 transition-colors hover:bg-emerald-50 hover:text-[#1B4332]">{children}</button>
);

export default function TreesTab({ onChanged }) {
  const [parks, setParks] = useState([]);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [reload, setReload] = useState(0);
  const [batchPark, setBatchPark] = useState("all");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get("/gmina/parks").then((r) => setParks(r.data)); }, [reload]);
  useEffect(() => { if (reload) onChanged?.(); }, [reload, onChanged]);

  const qr = async (t) => {
    try { await downloadBlob(`/gmina/trees/${t.id}/qr?origin=${origin()}`, `arbix_${t.tag_number}.png`); } catch (e) { toast.error(errMsg(e)); }
  };
  const batch = async () => {
    setBusy(true);
    try {
      await downloadBlob(`/gmina/qr-batch?origin=${origin()}${batchPark !== "all" ? `&park_id=${batchPark}` : ""}`, "arbix_qr.zip");
    } catch (e) { toast.error(errMsg(e, "Brak drzew do pobrania")); } finally { setBusy(false); }
  };
  const remove = async () => {
    try { await api.delete(`/gmina/trees/${del.id}`); toast.success("Usunięto drzewo"); setReload((x) => x + 1); } catch (e) { toast.error(errMsg(e)); }
    setDel(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <Button data-testid="add-tree-button" onClick={() => setEdit({})} className="h-12 rounded-full px-6"><Plus className="mr-1 h-4 w-4" />Dodaj drzewo</Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-sm font-semibold text-slate-600"><QrCode className="mr-1 inline h-4 w-4" />Kody QR dla producenta:</span>
          <Select value={batchPark} onValueChange={setBatchPark}>
            <SelectTrigger data-testid="qr-batch-park-select" className="h-11 w-full rounded-xl sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white"><SelectItem value="all">Wszystkie parki</SelectItem>{parks.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button data-testid="qr-batch-download-button" variant="outline" onClick={batch} disabled={busy} className="h-11 rounded-full">{busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}Pobierz ZIP</Button>
        </div>
      </div>
      <TreeList reloadKey={reload} renderActions={(t) => (
        <div className="flex shrink-0">
          <IconBtn onClick={() => qr(t)} testId={`qr-download-button-${t.tag_number}`} label="Pobierz kod QR"><QrCode className="h-4 w-4" /></IconBtn>
          <IconBtn onClick={() => setEdit(t)} testId={`tree-edit-${t.tag_number}`} label="Edytuj"><Pencil className="h-4 w-4" /></IconBtn>
          <IconBtn onClick={() => setDel(t)} testId={`tree-delete-${t.tag_number}`} label="Usuń"><Trash2 className="h-4 w-4" /></IconBtn>
        </div>
      )} />
      <TreeFormDialog open={!!edit} tree={edit?.id ? edit : null} parks={parks} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); setReload((x) => x + 1); }} />
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć drzewo {del?.tag_number}?</AlertDialogTitle>
            <AlertDialogDescription>Kody QR na tabliczce przestaną działać. Jeśli drzewo zostało wycięte, lepiej zmień jego stan na „Usunięte”.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="tree-delete-cancel">Anuluj</AlertDialogCancel>
            <AlertDialogAction data-testid="tree-delete-confirm" onClick={remove} className="bg-rose-600 hover:bg-rose-700">Usuń</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
