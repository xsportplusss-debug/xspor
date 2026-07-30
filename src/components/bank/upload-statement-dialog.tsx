import { useCallback, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/lib/mock-data";
import { parseStatementFile, dedupeWithin, dedupKey, type RawTx, type StatementParseResult } from "@/lib/bank-parsers";
import { validateStatementForBank } from "@/lib/bank-identity";
import { commitStatement, fetchExistingKeys, type BankLike } from "@/lib/bank-service";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bank: BankLike & { color?: string };
  onDone: () => void;
};

export function UploadStatementDialog({ open, onOpenChange, bank, onDone }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<StatementParseResult | null>(null);
  const [rows, setRows] = useState<RawTx[]>([]);
  const [dupCount, setDupCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setFile(null); setParsed(null); setRows([]); setDupCount(0); };

  const totals = useMemo(() => {
    const inn = rows.reduce((a, r) => a + (r.amount > 0 ? r.amount : 0), 0);
    const out = rows.reduce((a, r) => a + (r.amount < 0 ? -r.amount : 0), 0);
    return { inn, out };
  }, [rows]);

  const analyze = useCallback(async (f: File) => {
    setBusy(true);
    setFile(f);
    try {
      const check = await validateStatementForBank(f, bank.name);
      if (!check.ok) {
        toast.error(check.message ?? "Dosya bu bankaya ait değil");
        reset();
        return;
      }
      const result = await parseStatementFile(f);
      if (!result.transactions.length) {
        toast.error("Dosyada hareket bulunamadı", {
          description: result.warnings?.[0] ?? "Taranmış/görüntü PDF olabilir.",
        });
        reset();
        return;
      }
      const unique = dedupeWithin(result.transactions);
      let existing = new Set<string>();
      try { existing = await fetchExistingKeys(bank.id); } catch { /* offline */ }
      const fresh = unique.filter((t) => !existing.has(dedupKey(t)));
      setParsed(result);
      setRows(fresh);
      setDupCount(unique.length - fresh.length);
      toast.success(`${fresh.length} hareket okundu`, { description: result.parserLabel });
    } catch (e) {
      toast.error("Dosya okunamadı", { description: (e as Error).message });
      reset();
    } finally {
      setBusy(false);
    }
  }, [bank.id, bank.name]);

  const commit = async () => {
    if (!file || !parsed || !rows.length) return;
    setBusy(true);
    try {
      const { imported } = await commitStatement({ bank, file, parsed, rows });
      toast.success(`${imported} hareket kaydedildi`);
      reset();
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error("Kaydedilemedi", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const patch = (i: number, p: Partial<RawTx>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...p } : r)));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{bank.name} — Ekstre Yükle</DialogTitle>
        </DialogHeader>

        {!parsed ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault(); setDrag(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void analyze(f);
            }}
            className={`grid place-items-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
              drag ? "border-primary bg-primary/5" : "border-muted"
            }`}
          >
            {busy ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Dosya analiz ediliyor…</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Dosyayı buraya sürükleyin</p>
                  <p className="text-xs text-muted-foreground">PDF, XLSX, XLS veya CSV</p>
                </div>
                <Button variant="outline" onClick={() => inputRef.current?.click()}>Dosya Seç</Button>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.xls,.xlsx,.csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void analyze(f); }}
                />
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" />{file?.name}</Badge>
              <Badge variant="outline">{parsed.parserLabel}</Badge>
              <Badge variant="outline">{rows.length} yeni hareket</Badge>
              {dupCount > 0 && <Badge variant="outline">{dupCount} mükerrer atlandı</Badge>}
              <span className="text-emerald-500">Giriş {fmt(totals.inn)}</span>
              <span className="text-rose-500">Çıkış {fmt(totals.out)}</span>
              {parsed.periodStart && (
                <span className="text-muted-foreground">
                  Dönem: {parsed.periodStart} → {parsed.periodEnd}
                </span>
              )}
            </div>

            <div className="max-h-[45vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-28">Tarih</TableHead>
                    <TableHead className="w-16">Saat</TableHead>
                    <TableHead className="min-w-[240px]">Açıklama</TableHead>
                    <TableHead className="w-28 text-right">Tutar</TableHead>
                    <TableHead className="w-28 text-right">Bakiye</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={`${r.date}-${i}`}>
                      <TableCell>
                        <Input className="h-8" type="date" value={r.date}
                          onChange={(e) => patch(i, { date: e.target.value })} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.time ?? "—"}</TableCell>
                      <TableCell>
                        <Input className="h-8" value={r.description}
                          onChange={(e) => patch(i, { description: e.target.value })} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input className="h-8 text-right tabular-nums" type="number" step="0.01" value={r.amount}
                          onChange={(e) => patch(i, { amount: Number(e.target.value) })} />
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                        {r.balance != null ? fmt(r.balance) : "—"}
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost"
                          onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          {parsed && <Button variant="ghost" onClick={reset} disabled={busy}>Başka Dosya</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Kapat</Button>
          <Button onClick={commit} disabled={busy || !rows.length}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Onayla ve Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
