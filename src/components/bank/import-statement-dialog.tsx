import { useMemo, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileText, FolderOpen, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/lib/mock-data";
import { ACCEPT, bankDef, codeFromName, parseForBank, type ImportReport } from "@/lib/banks/registry";
import { commitImport, type BankRow } from "@/lib/banks/service";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  bank: BankRow;
  onDone: () => void;
};

type Done = { imported: number; duplicates: number };

export function ImportStatementDialog({ open, onOpenChange, bank, onDone }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [done, setDone] = useState<Done | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const def = useMemo(() => bankDef(bank.bank_code ?? codeFromName(bank.name)), [bank]);

  const reset = () => { setFile(null); setReport(null); setDone(null); setProgress(""); };

  const totals = useMemo(() => {
    const rows = report?.transactions ?? [];
    return {
      inn: rows.reduce((a, r) => a + (r.amount > 0 ? r.amount : 0), 0),
      out: rows.reduce((a, r) => a + (r.amount < 0 ? -r.amount : 0), 0),
    };
  }, [report]);

  const analyze = async (f: File) => {
    if (!def) { toast.error("Bu banka için ekstre okuyucu tanımlı değil. Bankayı düzenleyip banka türünü seçin."); return; }
    setBusy(true); setFile(f); setDone(null);
    try {
      const r = await parseForBank(f, def, (p, t) => setProgress(`Sayfa ${p}/${t} okunuyor…`));
      if (!r.transactions.length) {
        toast.error("Dosyada hareket bulunamadı", { description: r.errors[0]?.reason });
        reset();
        return;
      }
      setReport(r);
      toast.success(`${r.transactions.length} hareket okundu`, { description: r.parserLabel });
    } catch (e) {
      toast.error("Dosya okunamadı", { description: (e as Error).message });
      reset();
    } finally {
      setBusy(false); setProgress("");
    }
  };

  const commit = async () => {
    if (!file || !report) return;
    setBusy(true);
    try {
      const res = await commitImport({
        bank, file, report, rows: report.transactions,
        onProgress: (d, t) => setProgress(`${d}/${t} hareket kaydediliyor…`),
      });
      setDone({ imported: res.imported, duplicates: res.duplicates });
      toast.success(`${res.imported} hareket kaydedildi`);
      onDone();
    } catch (e) {
      toast.error("Kaydedilemedi", { description: (e as Error).message });
    } finally {
      setBusy(false); setProgress("");
    }
  };

  const preview = report?.transactions.slice(0, 200) ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{bank.name} — Ekstre Yükle</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" /> İçe aktarma tamamlandı
            </div>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              <li>Toplam okunan işlem: <b>{report?.totalRead ?? 0}</b></li>
              <li>Başarıyla aktarılan: <b>{done.imported}</b></li>
              <li>Atlanan (mükerrer): <b>{done.duplicates}</b></li>
              <li>Hatalı satır: <b>{report?.errors.length ?? 0}</b></li>
            </ul>
            {!!report?.errors.length && (
              <div className="max-h-40 overflow-auto rounded border bg-muted/40 p-2 text-xs">
                {report.errors.slice(0, 50).map((e, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-muted-foreground">Satır {e.line}:</span>
                    <span>{e.reason}</span>
                    <span className="truncate text-muted-foreground">{e.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : !report ? (
          <div className="grid place-items-center gap-3 rounded-lg border p-10 text-center">
            {busy ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{progress || "Dosya analiz ediliyor…"}</p>
              </>
            ) : (
              <>
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">{def?.label ?? bank.name} ekstresi seçin</p>
                  <p className="text-xs text-muted-foreground">PDF, XLSX, XLS veya CSV</p>
                </div>
                <Button onClick={() => inputRef.current?.click()}>Dosya Seç</Button>
                <input
                  ref={inputRef} type="file" accept={ACCEPT} className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void analyze(f); }}
                />
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" />{file?.name}</Badge>
              <Badge variant="outline">{report.parserLabel}</Badge>
              <Badge variant="outline">{report.transactions.length} hareket</Badge>
              {report.duplicatesInFile > 0 && <Badge variant="outline">{report.duplicatesInFile} mükerrer</Badge>}
              {!!report.errors.length && (
                <Badge variant="outline" className="gap-1 text-amber-500">
                  <AlertTriangle className="h-3 w-3" />{report.errors.length} hatalı satır
                </Badge>
              )}
              <span className="text-emerald-500">Giriş {fmt(totals.inn)}</span>
              <span className="text-rose-500">Çıkış {fmt(totals.out)}</span>
              {report.periodStart && (
                <span className="text-muted-foreground">Dönem: {report.periodStart} → {report.periodEnd}</span>
              )}
            </div>

            <div className="max-h-[45vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-28">Tarih</TableHead>
                    {def?.layout === "vakifbank" && <TableHead className="w-16">Saat</TableHead>}
                    {def?.layout === "vakifbank" && <TableHead className="w-28">İşlem No</TableHead>}
                    <TableHead className="min-w-[260px]">
                      {def?.layout === "vakifbank" ? "İşlem Adı" : "Açıklama"}
                    </TableHead>
                    <TableHead className="w-32 text-right">
                      {def?.layout === "vakifbank" ? "Miktar" : "Tutar"}
                    </TableHead>
                    <TableHead className="w-32 text-right">Bakiye</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="tabular-nums">{r.date.split("-").reverse().join(".")}</TableCell>
                      {def?.layout === "vakifbank" && <TableCell className="text-xs">{r.time ?? "—"}</TableCell>}
                      {def?.layout === "vakifbank" && <TableCell className="text-xs">{r.txNo ?? "—"}</TableCell>}
                      <TableCell className="text-xs">{r.description}</TableCell>
                      <TableCell className={`text-right tabular-nums ${r.amount < 0 ? "text-rose-500" : "text-emerald-500"}`}>
                        {fmt(r.amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {r.balance != null ? fmt(r.balance) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {report.transactions.length > preview.length && (
              <p className="text-xs text-muted-foreground">
                İlk {preview.length} hareket gösteriliyor; tamamı ({report.transactions.length}) kaydedilecek.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {done ? (
            <>
              <Button variant="outline" onClick={reset}>Yeni Dosya</Button>
              <Button onClick={() => { reset(); onOpenChange(false); }}>Kapat</Button>
            </>
          ) : (
            <>
              {report && <Button variant="ghost" onClick={reset} disabled={busy}>Başka Dosya</Button>}
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Kapat</Button>
              <Button onClick={commit} disabled={busy || !report}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {progress || "Onayla ve Kaydet"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
