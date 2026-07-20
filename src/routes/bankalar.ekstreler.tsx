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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileSpreadsheet, FileText, Landmark, Search, Trash2, RefreshCw,
  Download, ChevronDown, ChevronUp, Filter, History,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { fmt, type BankTxStatus } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { parsePdfTextLines, parseBankExcelStatement } from "@/lib/importers";
import { parseBankPdf } from "@/lib/bank-parsers";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/bankalar/ekstreler")({
  head: () => ({
    meta: [
      { title: "Banka Ekstreleri — Fintra" },
      { name: "description", content: "Tüm banka ekstreleri, hareketler, filtreleme ve içe aktarım." },
    ],
  }),
  component: Page,
});

const STATUSES: BankTxStatus[] = ["Yeni", "Muhasebeleştirildi", "Eşleşti"];
const PAGE_SIZES = [25, 50, 100];

type SortKey = "date" | "description" | "refNo" | "debit" | "credit" | "balance" | "currency" | "status";

const dedupKey = (t: { date: string; description: string; amount: number; refNo?: string }) =>
  `${t.date}|${t.refNo || ""}|${t.description.trim().toLowerCase()}|${t.amount.toFixed(2)}`;

function Page() {
  const banks = useStore((s) => s.banks);
  const bankTx = useStore((s) => s.bankTx);
  const bulkAddBankTx = useStore((s) => s.bulkAddBankTx);
  const updateBankTx = useStore((s) => s.updateBankTx);
  const removeBankTx = useStore((s) => s.removeBankTx);
  const bulkRemoveBankTx = useStore((s) => s.bulkRemoveBankTx);
  const bankImports = useStore((s) => s.bankImports);
  const addBankImport = useStore((s) => s.addBankImport);
  const removeBankImport = useStore((s) => s.removeBankImport);

  // ---- Upload ----
  const [uploadBankId, setUploadBankId] = useState<string>("");
  const pdfRef = useRef<HTMLInputElement>(null);
  const excelRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<null | {
    fileName: string;
    fileType: "xlsx" | "xls" | "csv" | "pdf";
    parserName: string;
    bankId: string;
    txs: Omit<import("@/lib/mock-data").BankTx, "id">[];
    duplicates: number;
    fresh: Omit<import("@/lib/mock-data").BankTx, "id">[];
    sameFileWarning?: boolean;
  }>(null);

  const chooseFile = (kind: "pdf" | "excel") => {
    if (!uploadBankId) { toast.error("Önce bir banka seçin"); return; }
    (kind === "pdf" ? pdfRef : excelRef).current?.click();
  };

  const onFile = async (file: File) => {
    if (!uploadBankId) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase() as "xlsx" | "xls" | "csv" | "pdf";
    try {
      let txs: Omit<import("@/lib/mock-data").BankTx, "id">[] = [];
      let parserName = "";
      if (ext === "pdf") {
        const lines = await parsePdfTextLines(file);
        const r = parseBankPdf(lines, uploadBankId);
        txs = r.txs; parserName = r.parser;
      } else if (ext === "xlsx" || ext === "xls" || ext === "csv") {
        const r = await parseBankExcelStatement(file, uploadBankId);
        txs = r.txs; parserName = r.parser;
      } else {
        toast.error("Desteklenmeyen dosya türü");
        return;
      }
      if (!txs.length) {
        toast.error("Dosyadan hareket çıkarılamadı");
        return;
      }
      // Existing tx for the same bank
      const existingKeys = new Set(bankTx.filter((t) => t.bankId === uploadBankId).map(dedupKey));
      const fresh = txs.filter((t) => !existingKeys.has(dedupKey(t)));
      const duplicates = txs.length - fresh.length;
      // Same file warning
      const sameFileWarning = bankImports.some(
        (imp) => imp.bankId === uploadBankId && imp.fileName === file.name && imp.total === txs.length
      );
      setPreview({
        fileName: file.name,
        fileType: ext,
        parserName,
        bankId: uploadBankId,
        txs,
        duplicates,
        fresh,
        sameFileWarning,
      });
    } catch (e: any) {
      toast.error("Dosya işlenemedi", { description: e?.message || String(e) });
    }
  };

  const confirmImport = (mode: "fresh" | "all") => {
    if (!preview) return;
    const list = mode === "all" ? preview.txs : preview.fresh;
    const importId = addBankImport({
      bankId: preview.bankId,
      fileName: preview.fileName,
      fileType: preview.fileType,
      importedAt: new Date().toISOString(),
      total: preview.txs.length,
      success: list.length,
      failed: preview.txs.length - list.length,
      parserName: preview.parserName,
    });
    bulkAddBankTx(list.map((t) => ({ ...t, importId })));
    toast.success(`${list.length} hareket eklendi`, {
      description: `${preview.duplicates} mükerrer${mode === "all" ? " (yine de içe aktarıldı)" : " atlandı"} · ${preview.parserName}`,
    });
    setPreview(null);
  };

  // ---- Filters ----
  const [q, setQ] = useState("");
  const [fBanks, setFBanks] = useState<string[]>([]);
  const [fCurrency, setFCurrency] = useState("all");
  const [fSide, setFSide] = useState<"all" | "debit" | "credit">("all");
  const [fStatus, setFStatus] = useState<"all" | BankTxStatus>("all");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fImportId, setFImportId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const bankMap = useMemo(() => Object.fromEntries(banks.map((b) => [b.id, b])), [banks]);
  const currencies = useMemo(() => {
    const s = new Set<string>();
    for (const b of banks) if (b.currency) s.add(b.currency);
    for (const t of bankTx) if (t.currency) s.add(t.currency);
    return [...s];
  }, [banks, bankTx]);

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    const arr = bankTx.filter((t) => {
      if (fImportId && t.importId !== fImportId) return false;
      if (fBanks.length && !fBanks.includes(t.bankId)) return false;
      const cur = t.currency || bankMap[t.bankId]?.currency;
      if (fCurrency !== "all" && cur !== fCurrency) return false;
      if (fSide === "debit" && !(t.amount < 0 || (t.debit || 0) > 0)) return false;
      if (fSide === "credit" && !(t.amount > 0 || (t.credit || 0) > 0)) return false;
      if (fStatus !== "all" && (t.status || "Yeni") !== fStatus) return false;
      if (fFrom && t.date < fFrom) return false;
      if (fTo && t.date > fTo) return false;
      if (qn) {
        const hay = `${t.description} ${t.refNo || ""} ${t.note || ""}`.toLowerCase();
        if (!hay.includes(qn)) return false;
      }
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const va: any = (a as any)[sortKey] ?? (sortKey === "debit" ? (a.amount < 0 ? -a.amount : 0)
        : sortKey === "credit" ? (a.amount > 0 ? a.amount : 0) : "");
      const vb: any = (b as any)[sortKey] ?? (sortKey === "debit" ? (b.amount < 0 ? -b.amount : 0)
        : sortKey === "credit" ? (b.amount > 0 ? b.amount : 0) : "");
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }, [bankTx, q, fBanks, fCurrency, fSide, fStatus, fFrom, fTo, fImportId, sortKey, sortDir, bankMap]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(
    () => filtered.slice(page * pageSize, page * pageSize + pageSize),
    [filtered, page, pageSize],
  );

  const summary = useMemo(() => {
    let debit = 0, credit = 0, last = "", lastBalance = 0, lastDate = "";
    for (const t of filtered) {
      const d = t.debit ?? (t.amount < 0 ? -t.amount : 0);
      const c = t.credit ?? (t.amount > 0 ? t.amount : 0);
      debit += d;
      credit += c;
      if (t.date > last) last = t.date;
      if (t.balance !== undefined && (!lastDate || t.date >= lastDate)) {
        lastDate = t.date;
        lastBalance = t.balance;
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
      Banka: bankMap[t.bankId]?.name || "",
      Açıklama: t.description,
      "Ref No": t.refNo || "",
      Borç: t.debit ?? (t.amount < 0 ? -t.amount : 0),
      Alacak: t.credit ?? (t.amount > 0 ? t.amount : 0),
      Bakiye: t.balance ?? "",
      Döviz: t.currency || bankMap[t.bankId]?.currency || "",
      Kaynak: t.source || "Manuel",
      Durum: t.status || "Yeni",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ekstreler");
    XLSX.writeFile(wb, `banka-ekstreleri-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const clearFilters = () => {
    setQ(""); setFBanks([]); setFCurrency("all"); setFSide("all");
    setFStatus("all"); setFFrom(""); setFTo(""); setFImportId(null); setPage(0);
  };

  const importsFor = (bankId: string) => bankImports.filter((i) => i.bankId === bankId);

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
        subtitle={`${bankTx.length} hareket · ${banks.length} banka`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)}>
              <History className="mr-1 h-4 w-4" /> Dosya Geçmişi ({bankImports.length})
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
          <div className="grid gap-3 sm:grid-cols-[minmax(200px,280px)_1fr_1fr] sm:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Banka Seç</label>
              <Select value={uploadBankId} onValueChange={setUploadBankId}>
                <SelectTrigger><SelectValue placeholder="Banka seçin..." /></SelectTrigger>
                <SelectContent>
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                        {b.name} · {b.currency}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              className="h-10"
              onClick={() => chooseFile("pdf")}
              disabled={!uploadBankId}
            >
              <FileText className="mr-2 h-4 w-4" /> PDF Yükle
            </Button>
            <Button
              variant="outline"
              className="h-10"
              onClick={() => chooseFile("excel")}
              disabled={!uploadBankId}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel Yükle (.xlsx / .xls / .csv)
            </Button>
            <input
              ref={pdfRef} type="file" accept="application/pdf,.pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
            />
            <input
              ref={excelRef} type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
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
                <Stat label="Parser" value={preview.parserName} />
                <Stat label="Toplam" value={String(preview.txs.length)} />
                <Stat label="Yeni" value={String(preview.fresh.length)} />
                <Stat label="Mükerrer" value={String(preview.duplicates)} />
              </div>
              {preview.sameFileWarning && (
                <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                  Aynı banka ekstresi daha önce yüklenmiştir.
                </div>
              )}
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
                    {preview.txs.slice(0, 100).map((t, i) => {
                      const d = t.debit ?? (t.amount < 0 ? -t.amount : 0);
                      const c = t.credit ?? (t.amount > 0 ? t.amount : 0);
                      return (
                        <TableRow key={i}>
                          <TableCell className="whitespace-nowrap text-xs">{t.date}</TableCell>
                          <TableCell className="max-w-[240px] truncate text-xs">{t.description}</TableCell>
                          <TableCell className="font-mono text-[10px] text-muted-foreground">{t.refNo || "—"}</TableCell>
                          <TableCell className="text-right text-xs text-destructive">{d ? fmt(d) : "—"}</TableCell>
                          <TableCell className="text-right text-xs text-success">{c ? fmt(c) : "—"}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">{t.balance !== undefined ? fmt(t.balance) : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setPreview(null)}>İptal</Button>
            <div className="flex gap-2">
              {preview?.duplicates ? (
                <Button variant="secondary" onClick={() => confirmImport("all")}>
                  Yine de içe aktar ({preview.txs.length})
                </Button>
              ) : null}
              <Button
                onClick={() => confirmImport("fresh")}
                className="gradient-primary text-primary-foreground"
                disabled={!preview?.fresh.length}
              >
                Aktar ({preview?.fresh.length ?? 0})
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File history */}
      {showHistory && (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Dosya Geçmişi</div>
              {fImportId && (
                <Button size="sm" variant="ghost" onClick={() => setFImportId(null)}>Filtreyi Temizle</Button>
              )}
            </div>
            {bankImports.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Henüz dosya yüklenmedi.</div>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Dosya Adı</TableHead>
                  <TableHead>Banka</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">İşlem Sayısı</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="w-40 text-right">İşlem</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {bankImports.map((imp) => (
                    <TableRow key={imp.id}>
                      <TableCell className="max-w-[280px] truncate">{imp.fileName}</TableCell>
                      <TableCell>{bankMap[imp.bankId]?.name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(imp.importedAt).toLocaleString("tr-TR")}</TableCell>
                      <TableCell className="text-right">{imp.success}/{imp.total}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-[10px]">{imp.fileType}</Badge>
                        {imp.parserName && <span className="ml-1 text-[10px] text-muted-foreground">{imp.parserName}</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" title="Aç"
                            onClick={() => { setFImportId(imp.id); setPage(0); toast.info("Dosyaya filtrelendi"); }}>
                            <Filter className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Yeniden İşle"
                            onClick={() => {
                              if (!confirm(`${imp.fileName} — bu dosyanın hareketleri silinsin ve dosyayı manuel olarak yeniden yükleyin.`)) return;
                              removeBankImport(imp.id);
                              toast.success("Silindi — dosyayı yeniden yükleyin");
                            }}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Sil"
                            onClick={() => {
                              if (!confirm(`${imp.fileName} ve bu dosyadan gelen tüm hareketler silinsin mi?`)) return;
                              removeBankImport(imp.id);
                              toast.success("Dosya ve hareketleri silindi");
                            }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="glass">
        <CardContent className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <button className="inline-flex items-center gap-1 text-sm font-medium" onClick={() => setShowFilters((v) => !v)}>
              <Filter className="h-4 w-4" /> Filtreler
              {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <Button size="sm" variant="ghost" onClick={clearFilters}>Temizle</Button>
          </div>
          {showFilters && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
              <div className="relative sm:col-span-2">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }}
                  placeholder="Açıklama veya referansta ara…" className="pl-8" />
              </div>
              <Select value={fCurrency} onValueChange={(v) => { setFCurrency(v); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Döviz" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Dövizler</SelectItem>
                  {currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fSide} onValueChange={(v) => { setFSide(v as any); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Borç/Alacak" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Borç + Alacak</SelectItem>
                  <SelectItem value="debit">Sadece Borç</SelectItem>
                  <SelectItem value="credit">Sadece Alacak</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fStatus} onValueChange={(v) => { setFStatus(v as any); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Durum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={fFrom} onChange={(e) => { setFFrom(e.target.value); setPage(0); }} />
              <Input type="date" value={fTo} onChange={(e) => { setFTo(e.target.value); setPage(0); }} />
              <div className="sm:col-span-6">
                <div className="flex flex-wrap gap-2">
                  {banks.map((b) => {
                    const active = fBanks.includes(b.id);
                    return (
                      <button key={b.id} type="button"
                        onClick={() => {
                          setPage(0);
                          setFBanks((cur) => active ? cur.filter((x) => x !== b.id) : [...cur, b.id]);
                        }}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                        {b.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background/80 backdrop-blur">
                <TableRow>
                  <TableHead><SortBtn label="Tarih" k="date" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} /></TableHead>
                  <TableHead>Banka</TableHead>
                  <TableHead><SortBtn label="Açıklama" k="description" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} /></TableHead>
                  <TableHead><SortBtn label="Ref No" k="refNo" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} /></TableHead>
                  <TableHead className="text-right"><SortBtn label="Borç" k="debit" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} /></TableHead>
                  <TableHead className="text-right"><SortBtn label="Alacak" k="credit" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} /></TableHead>
                  <TableHead className="text-right"><SortBtn label="Bakiye" k="balance" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} /></TableHead>
                  <TableHead>Döviz</TableHead>
                  <TableHead>Kaynak</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="py-10 text-center text-sm text-muted-foreground">
                    Hareket bulunamadı
                  </TableCell></TableRow>
                )}
                {pageRows.map((t) => {
                  const b = bankMap[t.bankId];
                  const cur = t.currency || b?.currency || "TRY";
                  const d = t.debit ?? (t.amount < 0 ? -t.amount : 0);
                  const c = t.credit ?? (t.amount > 0 ? t.amount : 0);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{t.date}</TableCell>
                      <TableCell>
                        {b ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                            {b.name}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate text-sm">{t.description}</TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{t.refNo || "—"}</TableCell>
                      <TableCell className="text-right font-medium text-destructive tabular-nums">{d ? fmt(d, cur) : "—"}</TableCell>
                      <TableCell className="text-right font-medium text-success tabular-nums">{c ? fmt(c, cur) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{t.balance !== undefined ? fmt(t.balance, cur) : "—"}</TableCell>
                      <TableCell className="text-xs">{cur}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{t.source || "Manuel"}</Badge></TableCell>
                      <TableCell>
                        <Select
                          value={t.status || "Yeni"}
                          onValueChange={(v) => updateBankTx(t.id, { status: v as BankTxStatus })}
                        >
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon"
                          onClick={() => { if (confirm("Bu hareket silinsin mi?")) { removeBankTx(t.id); toast.success("Silindi"); } }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3 text-sm">
            <div className="text-muted-foreground">
              {filtered.length ? `${page * pageSize + 1}–${Math.min(filtered.length, (page + 1) * pageSize)} / ${filtered.length}` : "0 kayıt"}
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(+v); setPage(0); }}>
                <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Önceki</Button>
              <span className="text-xs text-muted-foreground">Sayfa {page + 1}/{pageCount}</span>
              <Button size="sm" variant="outline" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>Sonraki</Button>
              {filtered.length > 0 && (
                <Button size="sm" variant="destructive" onClick={() => {
                  if (!confirm(`${filtered.length} hareket silinsin mi?`)) return;
                  bulkRemoveBankTx(filtered.map((t) => t.id));
                  toast.success("Silindi");
                }}>
                  <Trash2 className="mr-1 h-3 w-3" /> Filtrelenenleri Sil
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SumCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "primary" | "success" | "destructive" | "info" }) {
  const bg = tone === "success" ? "bg-success/10 text-success"
    : tone === "destructive" ? "bg-destructive/10 text-destructive"
    : tone === "primary" ? "bg-primary/10 text-primary"
    : tone === "info" ? "bg-info/10 text-info"
    : "bg-muted text-foreground";
  return (
    <Card className="glass">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`mt-2 inline-flex rounded-md px-2 py-0.5 text-lg font-bold tracking-tight ${bg}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function SortBtn({ label, k, sortKey, sortDir, onClick }: { label: string; k: SortKey; sortKey: SortKey; sortDir: "asc" | "desc"; onClick: (k: SortKey) => void }) {
  const active = sortKey === k;
  return (
    <button className={`inline-flex items-center gap-1 ${active ? "text-foreground" : "text-muted-foreground"}`} onClick={() => onClick(k)}>
      {label}
      {active && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
    </button>
  );
}
