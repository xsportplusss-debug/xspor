import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileUp, Landmark, Search, Trash2, Download, History, Filter, X,
  ChevronsUpDown, ArrowUp, ArrowDown, Eye, RotateCcw,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { fmt } from "@/lib/mock-data";
import { parsePdfTextLines, parseBankExcelStatement } from "@/lib/importers";
import { parseBankPdf } from "@/lib/bank-parsers";
import { EmptyState } from "@/components/empty-state";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listBanks, listImports, listTransactions,
  createImport, deleteImport, insertTransactions, deleteTransaction,
  type BankTxRow, type BankImportRow,
} from "@/lib/bank-db";

export const Route = createFileRoute("/bankalar/ekstreler")({
  head: () => ({
    meta: [
      { title: "Banka Ekstreleri — Fintra" },
      { name: "description", content: "Banka ekstrelerini yükleyin, hareketleri filtreleyip görüntüleyin." },
    ],
  }),
  validateSearch: (s): { bank?: string; import?: string } => ({
    bank: typeof s.bank === "string" ? s.bank : undefined,
    import: typeof s.import === "string" ? s.import : undefined,
  }),
  component: Page,
});

const PAGE_SIZES = [25, 50, 100];
type SortKey = "date" | "description" | "ref_no" | "debit" | "credit" | "balance";

type ParsedTx = {
  date: string;
  description: string;
  ref_no?: string | null;
  debit: number;
  credit: number;
  balance?: number | null;
  currency?: string | null;
  source: string;
};

const dedupKey = (bank_id: string, t: ParsedTx) =>
  `${bank_id}|${t.date}|${(t.ref_no || "").trim()}|${t.description.trim().toLowerCase()}|${t.debit.toFixed(2)}|${t.credit.toFixed(2)}`;

function normalizeParsed(raw: any, source: string): ParsedTx {
  const debit = raw.debit ?? (raw.amount < 0 ? -raw.amount : 0) ?? 0;
  const credit = raw.credit ?? (raw.amount > 0 ? raw.amount : 0) ?? 0;
  return {
    date: raw.date,
    description: raw.description ?? "",
    ref_no: raw.refNo ?? null,
    debit: Number(debit) || 0,
    credit: Number(credit) || 0,
    balance: raw.balance ?? null,
    currency: raw.currency ?? null,
    source,
  };
}

function Page() {
  const qc = useQueryClient();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data: banks = [] } = useQuery({ queryKey: ["banks"], queryFn: listBanks });
  const { data: allTx = [], isLoading: txLoading } = useQuery({
    queryKey: ["bank-tx"], queryFn: () => listTransactions(),
  });
  const { data: imports = [] } = useQuery({ queryKey: ["bank-imports"], queryFn: listImports });

  const bankMap = useMemo(() => Object.fromEntries(banks.map((b) => [b.id, b])), [banks]);

  // ---- Upload state ----
  const [uploadBankId, setUploadBankId] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<null | {
    fileName: string;
    fileType: string;
    parser: string;
    bankId: string;
    parsed: ParsedTx[];
    fresh: ParsedTx[];
    duplicates: number;
  }>(null);

  const onFile = async (file: File) => {
    if (!uploadBankId) { toast.error("Önce bir banka seçin"); return; }
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["pdf", "xlsx", "xls", "csv"].includes(ext)) {
      toast.error("Desteklenmeyen dosya türü");
      return;
    }
    try {
      let parsedRaw: any[] = [];
      let parser = "";
      let source = "Manuel";
      if (ext === "pdf") {
        const lines = await parsePdfTextLines(file);
        const r = parseBankPdf(lines, uploadBankId);
        parsedRaw = r.txs; parser = r.parser; source = "PDF";
      } else {
        const r = await parseBankExcelStatement(file, uploadBankId);
        parsedRaw = r.txs; parser = r.parser;
        source = ext === "csv" ? "CSV" : "Excel";
      }
      const parsed = parsedRaw.map((t) => normalizeParsed(t, source));
      if (!parsed.length) { toast.error("Dosyadan hareket çıkarılamadı"); return; }

      const existingKeys = new Set(
        allTx.filter((t) => t.bank_id === uploadBankId).map((t) => dedupKey(t.bank_id, {
          date: t.date, description: t.description, ref_no: t.ref_no, debit: Number(t.debit), credit: Number(t.credit), source: t.source,
        })),
      );
      const fresh = parsed.filter((t) => !existingKeys.has(dedupKey(uploadBankId, t)));
      setPreview({
        fileName: file.name,
        fileType: ext,
        parser,
        bankId: uploadBankId,
        parsed,
        fresh,
        duplicates: parsed.length - fresh.length,
      });
    } catch (e: any) {
      toast.error("Dosya işlenemedi", { description: e?.message || String(e) });
    }
  };

  const importMut = useMutation({
    mutationFn: async () => {
      if (!preview) return 0;
      const rec = await createImport({
        bank_id: preview.bankId,
        file_name: preview.fileName,
        file_type: preview.fileType,
        parser: preview.parser,
        tx_count: preview.fresh.length,
      });
      const inserted = await insertTransactions(
        preview.fresh.map((t) => ({
          bank_id: preview.bankId,
          import_id: rec.id,
          date: t.date,
          description: t.description,
          ref_no: t.ref_no ?? null,
          debit: t.debit,
          credit: t.credit,
          balance: t.balance ?? null,
          currency: t.currency ?? bankMap[preview.bankId]?.currency ?? null,
          source: t.source,
        })),
      );
      return inserted;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["bank-tx"] });
      qc.invalidateQueries({ queryKey: ["bank-imports"] });
      toast.success(`${n} hareket eklendi`);
      setPreview(null);
    },
    onError: (e: any) => toast.error("Aktarım başarısız", { description: e?.message }),
  });

  const deleteImportMut = useMutation({
    mutationFn: (id: string) => deleteImport(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-tx"] });
      qc.invalidateQueries({ queryKey: ["bank-imports"] });
      toast.success("Ekstre ve ilişkili hareketler silindi");
      setConfirmDeleteImport(null);
      if (search.import) navigate({ search: { ...search, import: undefined } as any });
    },
    onError: (e: any) => toast.error("Silinemedi", { description: e?.message }),
  });

  const deleteTxMut = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-tx"] });
      toast.success("Hareket silindi");
    },
    onError: (e: any) => toast.error("Silinemedi", { description: e?.message }),
  });

  // ---- Filters ----
  const [q, setQ] = useState("");
  const [fSide, setFSide] = useState<"all" | "debit" | "credit">("all");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(50);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDeleteImport, setConfirmDeleteImport] = useState<BankImportRow | null>(null);
  const [reprocessTarget, setReprocessTarget] = useState<BankImportRow | null>(null);
  const reprocessFileRef = useRef<HTMLInputElement>(null);

  const fBank = search.bank ?? "";
  const fImport = search.import ?? "";
  const setFBank = (v: string) =>
    navigate({ search: { ...search, bank: v || undefined } as any });
  const setFImport = (v: string) =>
    navigate({ search: { ...search, import: v || undefined } as any });

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    const arr = allTx.filter((t) => {
      if (fBank && t.bank_id !== fBank) return false;
      if (fImport && t.import_id !== fImport) return false;
      const debit = Number(t.debit);
      const credit = Number(t.credit);
      if (fSide === "debit" && !(debit > 0)) return false;
      if (fSide === "credit" && !(credit > 0)) return false;
      if (fFrom && t.date < fFrom) return false;
      if (fTo && t.date > fTo) return false;
      if (qn) {
        const hay = `${t.description} ${t.ref_no || ""}`.toLowerCase();
        if (!hay.includes(qn)) return false;
      }
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const va: any = (a as any)[sortKey] ?? "";
      const vb: any = (b as any)[sortKey] ?? "";
      const na = typeof va === "string" ? va : Number(va);
      const nb = typeof vb === "string" ? vb : Number(vb);
      if (na < nb) return -1 * dir;
      if (na > nb) return 1 * dir;
      return 0;
    });
    return arr;
  }, [allTx, q, fBank, fImport, fSide, fFrom, fTo, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(
    () => filtered.slice(page * pageSize, page * pageSize + pageSize),
    [filtered, page, pageSize],
  );

  const summary = useMemo(() => {
    let debit = 0, credit = 0, lastBalance = 0, lastDate = "";
    for (const t of filtered) {
      debit += Number(t.debit);
      credit += Number(t.credit);
      if (t.balance != null && (!lastDate || t.date >= lastDate)) {
        lastDate = t.date;
        lastBalance = Number(t.balance);
      }
    }
    return { debit, credit, count: filtered.length, lastBalance };
  }, [filtered]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const exportExcel = () => {
    const rows = filtered.map((t) => ({
      Tarih: t.date,
      Banka: bankMap[t.bank_id]?.name || "",
      Açıklama: t.description,
      "Ref No": t.ref_no || "",
      Borç: Number(t.debit),
      Alacak: Number(t.credit),
      Bakiye: t.balance ?? "",
      "Para Birimi": t.currency || bankMap[t.bank_id]?.currency || "",
      Kaynak: t.source,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ekstreler");
    XLSX.writeFile(wb, `banka-ekstreleri-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const clearFilters = () => {
    setQ(""); setFSide("all"); setFFrom(""); setFTo("");
    navigate({ search: {} as any });
    setPage(0);
  };

  const openReprocess = (imp: BankImportRow) => {
    setReprocessTarget(imp);
    // Delete first, then user picks a new file
    setUploadBankId(imp.bank_id);
    setTimeout(() => reprocessFileRef.current?.click(), 0);
  };

  const onReprocessFile = async (file: File) => {
    if (!reprocessTarget) return;
    try {
      await deleteImport(reprocessTarget.id);
      qc.invalidateQueries({ queryKey: ["bank-tx"] });
      qc.invalidateQueries({ queryKey: ["bank-imports"] });
      setReprocessTarget(null);
      await onFile(file);
    } catch (e: any) {
      toast.error("Yeniden işlenemedi", { description: e?.message });
    }
  };

  if (banks.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Banka Ekstreleri" subtitle="Önce bir banka tanımlayın." />
        <EmptyState
          icon={Landmark}
          title="Henüz banka yok"
          desc="Ekstre yüklemek için önce Banka Ekle sayfasından hesap oluşturun."
          action={<Link to="/bankalar/hesaplar"><Button size="sm" className="gradient-primary text-primary-foreground">Banka Ekle</Button></Link>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banka Ekstreleri"
        subtitle={`${allTx.length} hareket · ${banks.length} banka`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)}>
              <History className="mr-1 h-4 w-4" /> Dosya Geçmişi ({imports.length})
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel} disabled={filtered.length === 0}>
              <Download className="mr-1 h-4 w-4" /> Excel'e Aktar
            </Button>
          </>
        }
      />

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SumCard label="Toplam Borç" value={fmt(summary.debit)} tone="destructive" />
        <SumCard label="Toplam Alacak" value={fmt(summary.credit)} tone="success" />
        <SumCard label="Toplam İşlem" value={String(summary.count)} tone="primary" />
        <SumCard label="Son Bakiye" value={fmt(summary.lastBalance)} tone="info" />
      </div>

      {/* Upload */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(220px,320px)_auto] sm:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Banka Seç</label>
              <Select value={uploadBankId} onValueChange={setUploadBankId}>
                <SelectTrigger><SelectValue placeholder="Banka seçin..." /></SelectTrigger>
                <SelectContent>
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} · {b.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="h-10 gradient-primary text-primary-foreground"
              onClick={() => {
                if (!uploadBankId) return toast.error("Önce bir banka seçin");
                fileRef.current?.click();
              }}
              disabled={!uploadBankId}
            >
              <FileUp className="mr-2 h-4 w-4" /> Ekstre Ekle (PDF, XLSX, XLS, CSV)
            </Button>
            <input
              ref={fileRef} type="file"
              accept=".pdf,.xlsx,.xls,.csv,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
            />
            <input
              ref={reprocessFileRef} type="file"
              accept=".pdf,.xlsx,.xls,.csv,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onReprocessFile(f); e.target.value = ""; }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview dialog */}
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Önizleme — {preview?.fileName}</DialogTitle>
          </DialogHeader>
          {preview && (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Stat label="Parser" value={preview.parser} />
                <Stat label="Toplam" value={String(preview.parsed.length)} />
                <Stat label="Yeni" value={String(preview.fresh.length)} />
                <Stat label="Mükerrer" value={String(preview.duplicates)} />
              </div>
              <div className="max-h-72 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Açıklama</TableHead>
                      <TableHead>Ref</TableHead>
                      <TableHead className="text-right">Borç</TableHead>
                      <TableHead className="text-right">Alacak</TableHead>
                      <TableHead className="text-right">Bakiye</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.parsed.slice(0, 100).map((t, i) => (
                      <TableRow key={i}>
                        <TableCell className="whitespace-nowrap text-xs">{t.date}</TableCell>
                        <TableCell className="max-w-[240px] truncate text-xs">{t.description}</TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground">{t.ref_no || "—"}</TableCell>
                        <TableCell className="text-right text-xs text-destructive">{t.debit ? fmt(t.debit) : "—"}</TableCell>
                        <TableCell className="text-right text-xs text-success">{t.credit ? fmt(t.credit) : "—"}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{t.balance != null ? fmt(Number(t.balance)) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreview(null)}>İptal</Button>
            <Button
              onClick={() => importMut.mutate()}
              className="gradient-primary text-primary-foreground"
              disabled={!preview?.fresh.length || importMut.isPending}
            >
              {importMut.isPending ? "Aktarılıyor..." : `Aktar (${preview?.fresh.length ?? 0})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card className="glass">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }}
                placeholder="Açıklama veya referans ara..."
                className="pl-8"
              />
            </div>
            <Select value={fBank || "all"} onValueChange={(v) => { setFBank(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Banka" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm bankalar</SelectItem>
                {banks.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fSide} onValueChange={(v: any) => { setFSide(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Borç + Alacak</SelectItem>
                <SelectItem value="debit">Sadece Borç</SelectItem>
                <SelectItem value="credit">Sadece Alacak</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={fFrom} onChange={(e) => { setFFrom(e.target.value); setPage(0); }} className="w-[150px]" />
            <Input type="date" value={fTo} onChange={(e) => { setFTo(e.target.value); setPage(0); }} className="w-[150px]" />
            {(q || fBank || fImport || fSide !== "all" || fFrom || fTo) && (
              <Button size="sm" variant="ghost" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" /> Temizle
              </Button>
            )}
          </div>
          {fImport && (
            <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
              <Filter className="h-3.5 w-3.5 text-primary" />
              <span>Dosya filtresi aktif: <b>{imports.find((i) => i.id === fImport)?.file_name || fImport}</b></span>
              <Button size="sm" variant="ghost" className="ml-auto h-6" onClick={() => setFImport("")}>Kaldır</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File history */}
      {showHistory && (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="mb-3 text-sm font-semibold">Dosya Geçmişi</div>
            {imports.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Henüz ekstre yüklenmedi</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dosya Adı</TableHead>
                      <TableHead>Banka</TableHead>
                      <TableHead>Tür</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead className="text-right">İşlem</TableHead>
                      <TableHead className="text-right">Aksiyon</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {imports.map((imp) => (
                      <TableRow key={imp.id}>
                        <TableCell className="max-w-[260px] truncate text-xs font-medium">{imp.file_name}</TableCell>
                        <TableCell className="text-xs">{bankMap[imp.bank_id]?.name || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="uppercase text-[10px]">{imp.file_type}</Badge></TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(imp.uploaded_at).toLocaleString("tr-TR")}</TableCell>
                        <TableCell className="text-right text-xs font-mono">{imp.tx_count}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" title="Görüntüle"
                              onClick={() => { setFImport(imp.id); setShowHistory(false); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Yeniden İşle" onClick={() => openReprocess(imp)}>
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Sil" onClick={() => setConfirmDeleteImport(imp)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transactions table */}
      <Card className="glass">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TH label="Tarih" onSort={() => toggleSort("date")} active={sortKey === "date"} dir={sortDir} />
                  <TH label="Açıklama" onSort={() => toggleSort("description")} active={sortKey === "description"} dir={sortDir} />
                  <TH label="Ref No" onSort={() => toggleSort("ref_no")} active={sortKey === "ref_no"} dir={sortDir} />
                  <TH label="Banka" />
                  <TH label="Borç" onSort={() => toggleSort("debit")} active={sortKey === "debit"} dir={sortDir} align="right" />
                  <TH label="Alacak" onSort={() => toggleSort("credit")} active={sortKey === "credit"} dir={sortDir} align="right" />
                  <TH label="Bakiye" onSort={() => toggleSort("balance")} active={sortKey === "balance"} dir={sortDir} align="right" />
                  <TH label="Döviz" />
                  <TH label="Kaynak" />
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {txLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">Yükleniyor...</TableCell></TableRow>
                ) : pageRows.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">Kayıt bulunamadı</TableCell></TableRow>
                ) : pageRows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap text-xs">{t.date}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-xs">{t.description}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{t.ref_no || "—"}</TableCell>
                    <TableCell className="text-xs">{bankMap[t.bank_id]?.name || "—"}</TableCell>
                    <TableCell className="text-right text-xs text-destructive font-medium">
                      {Number(t.debit) > 0 ? fmt(Number(t.debit)) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-success font-medium">
                      {Number(t.credit) > 0 ? fmt(Number(t.credit)) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {t.balance != null ? fmt(Number(t.balance)) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{t.currency || bankMap[t.bank_id]?.currency || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{t.source}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" title="Sil" onClick={() => deleteTxMut.mutate(t.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3 text-xs text-muted-foreground">
            <div>
              {filtered.length ? `${page * pageSize + 1}-${Math.min((page + 1) * pageSize, filtered.length)} / ${filtered.length}` : "0 kayıt"}
            </div>
            <div className="flex items-center gap-2">
              <span>Sayfa boyutu:</span>
              <select
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              >
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Önceki</Button>
              <span>{page + 1} / {pageCount}</span>
              <Button size="sm" variant="outline" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>Sonraki</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmDeleteImport} onOpenChange={(v) => !v && setConfirmDeleteImport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bu ekstreyi silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              <b>{confirmDeleteImport?.file_name}</b> dosyası ve ona ait tüm hareketler kalıcı olarak silinecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteImport && deleteImportMut.mutate(confirmDeleteImport.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SumCard({ label, value, tone }: { label: string; value: string; tone: "destructive" | "success" | "primary" | "info" }) {
  const toneClass =
    tone === "destructive" ? "text-destructive bg-destructive/10" :
    tone === "success" ? "text-success bg-success/10" :
    tone === "info" ? "text-info bg-info/10" :
    "text-primary bg-primary/10";
  return (
    <Card className="glass">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`mt-1 inline-block rounded-md px-2 py-1 text-lg font-bold tracking-tight ${toneClass}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function TH({
  label, onSort, active, dir, align,
}: { label: string; onSort?: () => void; active?: boolean; dir?: "asc" | "desc"; align?: "right" | "left" }) {
  return (
    <TableHead className={align === "right" ? "text-right" : ""}>
      {onSort ? (
        <button className="inline-flex items-center gap-1 text-xs font-medium hover:text-foreground" onClick={onSort}>
          {label}
          {active ? (dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
            : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
        </button>
      ) : label}
    </TableHead>
  );
}
