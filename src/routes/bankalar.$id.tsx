import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, ArrowDownLeft, ArrowUpRight, FileSpreadsheet, FileText,
  Pencil, Plus, Trash2, Upload, History, Search, X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { fmt, type BankTx } from "@/lib/mock-data";
import { useStore, bankBalance } from "@/lib/store";
import { parseExcel, parsePdfTextLines, rowsToBankTx } from "@/lib/importers";
import { parseBankPdf } from "@/lib/bank-parsers";
import { useSelection } from "@/hooks/use-selection";

export const Route = createFileRoute("/bankalar/$id")({
  head: () => ({ meta: [{ title: "Banka Hareketleri — Fintra" }] }),
  component: Page,
});

type Form = {
  bankId: string; date: string; description: string; category: string;
  type: "in" | "out"; amount: number;
  refNo: string; note: string; cariId: string;
};

const CATEGORIES = ["Satış Tahsilatı", "Alış Ödemesi", "Havale", "EFT", "Kredi Kartı", "Vergi", "Kira", "Personel", "Kargo", "Yakıt", "Diğer"];

const dedupKey = (t: { date: string; description: string; amount: number; refNo?: string }) =>
  `${t.date}|${t.refNo || ""}|${t.description.trim().toLowerCase()}|${t.amount.toFixed(2)}`;

function Page() {
  const { id } = useParams({ from: "/bankalar/$id" });
  const banks = useStore((s) => s.banks);
  const bank = banks.find((b) => b.id === id);
  const allTx = useStore((s) => s.bankTx);
  const cariList = useStore((s) => s.cariList);
  const addBankTx = useStore((s) => s.addBankTx);
  const bulkAddBankTx = useStore((s) => s.bulkAddBankTx);
  const updateBankTx = useStore((s) => s.updateBankTx);
  const removeBankTx = useStore((s) => s.removeBankTx);
  const bulkRemoveBankTx = useStore((s) => s.bulkRemoveBankTx);
  const imports = useStore((s) => s.bankImports.filter((x) => x.bankId === id));
  const addImport = useStore((s) => s.addBankImport);
  const removeImport = useStore((s) => s.removeBankImport);

  const tx = useMemo(() => allTx.filter((t) => t.bankId === id), [allTx, id]);

  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<BankTx | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [ftype, setFtype] = useState<"all" | "in" | "out">("all");
  const [fcat, setFcat] = useState("all");
  const [fdateFrom, setFdateFrom] = useState("");
  const [fdateTo, setFdateTo] = useState("");
  const [famtMin, setFamtMin] = useState("");
  const [famtMax, setFamtMax] = useState("");

  const emptyForm = (): Form => ({
    bankId: id, date: new Date().toISOString().slice(0, 10),
    description: "", category: "", type: "in", amount: 0,
    refNo: "", note: "", cariId: "",
  });
  const [form, setForm] = useState<Form>(emptyForm());

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return tx.filter((t) => {
      if (ftype === "in" && t.amount <= 0) return false;
      if (ftype === "out" && t.amount >= 0) return false;
      if (fcat !== "all" && (t.category || "—") !== fcat) return false;
      if (fdateFrom && t.date < fdateFrom) return false;
      if (fdateTo && t.date > fdateTo) return false;
      const abs = Math.abs(t.amount);
      if (famtMin && abs < +famtMin) return false;
      if (famtMax && abs > +famtMax) return false;
      if (qn) {
        const hay = `${t.description} ${t.refNo || ""} ${t.note || ""} ${t.category || ""}`.toLowerCase();
        if (!hay.includes(qn)) return false;
      }
      return true;
    }).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [tx, q, ftype, fcat, fdateFrom, fdateTo, famtMin, famtMax]);

  // Running balance from oldest to newest (based on all tx, not just filtered)
  const runningMap = useMemo(() => {
    const ordered = [...tx].sort((a, b) => (a.date > b.date ? 1 : -1));
    const map = new Map<string, number>();
    let bal = bank?.balance || 0;
    for (const t of ordered) {
      bal += t.amount;
      map.set(t.id, bal);
    }
    return map;
  }, [tx, bank]);

  const sel = useSelection(filtered);

  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 8) + "01";
    let tin = 0, tout = 0, min = 0, mout = 0, last = "";
    for (const t of tx) {
      if (t.date === today) { if (t.amount > 0) tin += t.amount; else tout += -t.amount; }
      if (t.date >= monthStart) { if (t.amount > 0) min += t.amount; else mout += -t.amount; }
      if (!last || t.date > last) last = t.date;
    }
    return { tin, tout, min, mout, last, count: tx.length };
  }, [tx]);

  if (!bank) {
    return (
      <div className="space-y-6">
        <PageHeader title="Bulunamadı" />
        <Link to="/bankalar"><Button variant="outline"><ArrowLeft className="mr-1 h-4 w-4" /> Bankalar</Button></Link>
      </div>
    );
  }

  const cur = bank.currency;

  const save = () => {
    if (!form.amount) return toast.error("Tutar girin");
    addBankTx({
      bankId: form.bankId, date: form.date, description: form.description || "—",
      category: form.category || undefined,
      amount: form.type === "in" ? Math.abs(form.amount) : -Math.abs(form.amount),
      refNo: form.refNo || undefined, note: form.note || undefined,
      cariId: form.cariId || undefined,
    });
    setOpenNew(false); setForm(emptyForm());
    toast.success("Hareket eklendi", { description: "Dashboard, Gelir/Gider ve raporlara işlendi." });
  };

  const saveEdit = () => {
    if (!editing) return;
    updateBankTx(editing.id, editing);
    setEditing(null);
    toast.success("Güncellendi");
  };

  const clearFilters = () => {
    setQ(""); setFtype("all"); setFcat("all");
    setFdateFrom(""); setFdateTo(""); setFamtMin(""); setFamtMax("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={bank.name}
        subtitle={bank.iban || "IBAN yok"}
        actions={
          <>
            <Link to="/bankalar"><Button variant="outline" size="sm"><ArrowLeft className="mr-1 h-4 w-4" /> Geri</Button></Link>
            <Button variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)}>
              <History className="mr-1 h-4 w-4" /> Dosya Geçmişi {imports.length > 0 && `(${imports.length})`}
            </Button>
            {(["excel", "csv", "pdf"] as const).map((k) => (
              <BankImportButton key={k} bankId={id} kind={k}
                onDone={(txs, meta, parserName) => {
                  const existing = new Set(tx.map(dedupKey));
                  const fresh = txs.filter((x) => !existing.has(dedupKey(x)));
                  const importId = addImport({ ...meta, success: fresh.length, failed: txs.length - fresh.length });
                  bulkAddBankTx(fresh.map((x) => ({ ...x, importId })));
                  toast.success(`${fresh.length} hareket eklendi`, {
                    description: `${txs.length - fresh.length} mükerrer atlandı · ${meta.fileName}${parserName ? ` · ${parserName}` : ""}`,
                  });
                }} />
            ))}
            <Dialog open={openNew} onOpenChange={(v) => { setOpenNew(v); if (v) setForm(emptyForm()); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
                  <Plus className="mr-1 h-4 w-4" /> Banka Hareketi Ekle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Yeni Banka Hareketi</DialogTitle></DialogHeader>
                <TxForm value={form} onChange={setForm} banks={banks} caris={cariList} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenNew(false)}>İptal</Button>
                  <Button onClick={save} className="gradient-primary text-primary-foreground">Kaydet</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SumCard label="Güncel Bakiye" value={fmt(bankBalance(id), cur)} tone="primary" />
        <SumCard label="Bugün Gelen / Giden" value={`${fmt(summary.tin, cur)} · ${fmt(summary.tout, cur)}`} tone="success" />
        <SumCard label="Bu Ay Gelen / Giden" value={`${fmt(summary.min, cur)} · ${fmt(summary.mout, cur)}`} tone="info" />
        <SumCard label="Son Hareket" value={summary.last || "—"} hint={`${summary.count} hareket`} />
      </div>

      {/* Import history */}
      {showHistory && (
        <Card className="glass"><CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">Dosya Geçmişi</div>
            <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}><X className="h-4 w-4" /></Button>
          </div>
          {imports.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Henüz dosya yüklenmedi.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Dosya</TableHead><TableHead>Tür</TableHead><TableHead>Tarih</TableHead>
                <TableHead className="text-right">Toplam</TableHead>
                <TableHead className="text-right">Başarılı</TableHead>
                <TableHead className="text-right">Mükerrer</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {imports.map((imp) => (
                  <TableRow key={imp.id}>
                    <TableCell className="max-w-[280px] truncate">{imp.fileName}</TableCell>
                    <TableCell><Badge variant="outline" className="uppercase">{imp.fileType}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{new Date(imp.importedAt).toLocaleString("tr-TR")}</TableCell>
                    <TableCell className="text-right">{imp.total}</TableCell>
                    <TableCell className="text-right text-success">{imp.success}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{imp.failed}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => {
                        if (confirm("Dosya ve bu dosyadan gelen hareketler silinsin mi?")) removeImport(imp.id);
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent></Card>
      )}

      {/* Filters */}
      <Card className="glass"><CardContent className="p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara: açıklama, ref, not…" className="pl-8" />
          </div>
          <Select value={ftype} onValueChange={(v) => setFtype(v as any)}>
            <SelectTrigger><SelectValue placeholder="İşlem Türü" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="in">Gelen</SelectItem>
              <SelectItem value="out">Giden</SelectItem>
            </SelectContent>
          </Select>
          <Select value={fcat} onValueChange={setFcat}>
            <SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Kategoriler</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={fdateFrom} onChange={(e) => setFdateFrom(e.target.value)} />
          <Input type="date" value={fdateTo} onChange={(e) => setFdateTo(e.target.value)} />
          <Input type="number" placeholder="Min tutar" value={famtMin} onChange={(e) => setFamtMin(e.target.value)} />
          <Input type="number" placeholder="Max tutar" value={famtMax} onChange={(e) => setFamtMax(e.target.value)} />
          <Button variant="outline" size="sm" onClick={clearFilters}>Filtreleri Temizle</Button>
        </div>
      </CardContent></Card>

      {/* Table */}
      <Card className="glass"><CardContent className="p-4">
        {sel.selectedIds.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{sel.selectedIds.length} hareket seçili</span>
            <Button variant="destructive" size="sm" onClick={() => { bulkRemoveBankTx(sel.selectedIds); sel.clear(); }}>
              <Trash2 className="mr-1 h-4 w-4" /> Sil
            </Button>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background/80 backdrop-blur">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={sel.allChecked ? true : sel.someChecked ? "indeterminate" : false}
                    onCheckedChange={sel.toggleAll}
                  />
                </TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Ref No</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead className="text-right">Bakiye</TableHead>
                <TableHead>Not</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                  Hareket bulunamadı
                </TableCell></TableRow>
              )}
              {filtered.map((t) => {
                const isIn = t.amount >= 0;
                return (
                  <TableRow key={t.id} data-state={sel.selected.has(t.id) ? "selected" : undefined}>
                    <TableCell><Checkbox checked={sel.selected.has(t.id)} onCheckedChange={() => sel.toggle(t.id)} /></TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{t.date}</TableCell>
                    <TableCell className="max-w-[320px] truncate">{t.description}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{t.refNo || "—"}</TableCell>
                    <TableCell>
                      {isIn ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          <ArrowDownLeft className="h-3 w-3" /> Gelen
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                          <ArrowUpRight className="h-3 w-3" /> Giden
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.category || "—"}</TableCell>
                    <TableCell className={`text-right font-semibold ${isIn ? "text-success" : "text-destructive"}`}>
                      {isIn ? fmt(t.amount, cur) : `-${fmt(-t.amount, cur)}`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {fmt(runningMap.get(t.id) || 0, cur)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{t.note || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditing(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { removeBankTx(t.id); toast.success("Silindi"); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent></Card>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hareketi Düzenle</DialogTitle></DialogHeader>
          {editing && (
            <TxForm
              value={{
                bankId: editing.bankId, date: editing.date,
                description: editing.description, category: editing.category || "",
                type: editing.amount >= 0 ? "in" : "out",
                amount: Math.abs(editing.amount),
                refNo: editing.refNo || "", note: editing.note || "",
                cariId: editing.cariId || "",
              }}
              onChange={(f) => setEditing({
                ...editing, bankId: f.bankId, date: f.date, description: f.description,
                category: f.category || undefined,
                amount: f.type === "in" ? Math.abs(f.amount) : -Math.abs(f.amount),
                refNo: f.refNo || undefined, note: f.note || undefined,
                cariId: f.cariId || undefined,
              })}
              banks={banks} caris={cariList}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>İptal</Button>
            <Button onClick={saveEdit} className="gradient-primary text-primary-foreground">Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SumCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "primary" | "success" | "info" }) {
  const bg = tone === "primary" ? "bg-primary/10" : tone === "success" ? "bg-success/10" : tone === "info" ? "bg-info/10" : "bg-muted";
  return (
    <Card className="glass"><CardContent className="p-4">
      <div className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${bg}`}>{label}</div>
      <div className="mt-2 text-lg font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </CardContent></Card>
  );
}

function TxForm({
  value, onChange, banks, caris,
}: {
  value: Form;
  onChange: (v: Form) => void;
  banks: { id: string; name: string }[];
  caris: { id: string; title: string }[];
}) {
  const set = (p: Partial<Form>) => onChange({ ...value, ...p });
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Banka</Label>
          <Select value={value.bankId} onValueChange={(v) => set({ bankId: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {banks.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tarih</Label>
          <Input type="date" value={value.date} onChange={(e) => set({ date: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>İşlem Türü</Label>
          <Select value={value.type} onValueChange={(v) => set({ type: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in">Gelir (Gelen)</SelectItem>
              <SelectItem value="out">Gider (Giden)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tutar</Label>
          <Input type="number" value={value.amount} onChange={(e) => set({ amount: +e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Kategori</Label>
          <Select value={value.category || "none"} onValueChange={(v) => set({ category: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Referans No</Label>
          <Input value={value.refNo} onChange={(e) => set({ refNo: e.target.value })} placeholder="İsteğe bağlı" />
        </div>
      </div>
      <div>
        <Label>Cari Hesap (opsiyonel)</Label>
        <Select value={value.cariId || "none"} onValueChange={(v) => set({ cariId: v === "none" ? "" : v })}>
          <SelectTrigger><SelectValue placeholder="Cari seçin" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {caris.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Açıklama</Label>
        <Input value={value.description} onChange={(e) => set({ description: e.target.value })} />
      </div>
      <div>
        <Label>Not</Label>
        <Textarea rows={2} value={value.note} onChange={(e) => set({ note: e.target.value })} />
      </div>
    </div>
  );
}

// -------- Import button with drag/drop + preview + column mapping --------

type ImportMeta = { bankId: string; fileName: string; fileType: "xlsx" | "xls" | "csv" | "pdf"; importedAt: string; total: number };

const MAP_FIELDS = [
  { id: "date", label: "Tarih" },
  { id: "desc", label: "Açıklama" },
  { id: "in", label: "Alacak / Gelen" },
  { id: "out", label: "Borç / Giden" },
  { id: "amount", label: "Tutar (± işaretli)" },
  { id: "ref", label: "Referans No" },
  { id: "category", label: "Kategori" },
] as const;

type FieldId = typeof MAP_FIELDS[number]["id"];

function guessField(header: string): FieldId | "" {
  const h = header.toLowerCase();
  if (/(tarih|date)/.test(h)) return "date";
  if (/(alacak|gelen|giris|credit|deposit)/.test(h)) return "in";
  if (/(borc|giden|cikis|debit|withdraw)/.test(h)) return "out";
  if (/(tutar|amount|meblag)/.test(h)) return "amount";
  if (/(aciklama|açıklama|desc|firma|explain)/.test(h)) return "desc";
  if (/(ref|dekont|belge|islem no)/.test(h)) return "ref";
  if (/(kategori|category|tur)/.test(h)) return "category";
  return "";
}

function BankImportButton({
  bankId, kind, onDone,
}: {
  bankId: string;
  kind: "excel" | "csv" | "pdf";
  onDone: (
    txs: Omit<BankTx, "id">[],
    meta: Omit<ImportMeta, "success" | "failed"> & { fileName: string },
    parserName?: string,
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<FieldId, string>>({} as any);
  const [pdfPreview, setPdfPreview] = useState<Omit<BankTx, "id">[]>([]);
  const [pdfParser, setPdfParser] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setFile(null); setRows([]); setHeaders([]); setMapping({} as any); setPdfPreview([]); setPdfParser(""); };

  const handleFile = async (f: File) => {
    setLoading(true);
    try {
      if (kind === "excel" || kind === "csv") {
        const r = await parseExcel(f);
        const hs = r.length ? Object.keys(r[0]) : [];
        const m = {} as Record<FieldId, string>;
        for (const h of hs) {
          const g = guessField(h);
          if (g && !m[g]) m[g] = h;
        }
        setRows(r); setHeaders(hs); setMapping(m); setFile(f);
        setOpen(true);
      } else {
        const lines = await parsePdfTextLines(f);
        const { txs, parser } = parseBankPdf(lines, bankId);
        setPdfPreview(txs);
        setPdfParser(parser);
        setFile(f);
        setOpen(true);
      }
    } catch (e: any) {
      toast.error("Dosya okunamadı", { description: e.message });
    } finally { setLoading(false); }
  };

  const applyExcel = () => {
    if (!file) return;
    const mapped = rows.map((r) => {
      const d = mapping.date ? r[mapping.date] : "";
      const desc = mapping.desc ? r[mapping.desc] : "";
      const cin = mapping.in ? r[mapping.in] : "";
      const cout = mapping.out ? r[mapping.out] : "";
      const cam = mapping.amount ? r[mapping.amount] : "";
      const remapped: any = {
        tarih: d, aciklama: desc, gelen: cin, giden: cout, tutar: cam,
        ref: mapping.ref ? r[mapping.ref] : "",
        kategori: mapping.category ? r[mapping.category] : "",
      };
      return remapped;
    });
    const txs = rowsToBankTx(mapped, bankId).map((t, i) => ({
      ...t,
      refNo: mapped[i].ref ? String(mapped[i].ref) : undefined,
    }));
    const ext: "csv" | "xls" | "xlsx" = kind === "csv" || file.name.toLowerCase().endsWith(".csv") ? "csv"
      : file.name.toLowerCase().endsWith(".xls") ? "xls" : "xlsx";
    onDone(txs, { bankId, fileName: file.name, fileType: ext, importedAt: new Date().toISOString(), total: txs.length });
    setOpen(false); reset();
  };

  const applyPdf = () => {
    if (!file) return;
    onDone(pdfPreview, { bankId, fileName: file.name, fileType: "pdf", importedAt: new Date().toISOString(), total: pdfPreview.length }, pdfParser);
    setOpen(false); reset();
  };

  const accept = kind === "excel" ? ".xlsx,.xls" : kind === "csv" ? ".csv" : "application/pdf";
  const label = kind === "excel" ? "Excel Yükle" : kind === "csv" ? "CSV Yükle" : "PDF Yükle";
  const icon = kind === "pdf" ? <FileText className="mr-1 h-4 w-4" /> : <FileSpreadsheet className="mr-1 h-4 w-4" />;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {icon} {label}
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {kind === "pdf" ? "Banka Ekstresi Önizleme (PDF)" : kind === "csv" ? "CSV Ekstre Önizleme" : "Excel Ekstre Önizleme"}
            </DialogTitle>
          </DialogHeader>

          {file && kind !== "pdf" ? (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">{file.name} · {rows.length} satır</div>
              <div className="grid gap-2 sm:grid-cols-2">

              {MAP_FIELDS.map((f) => (
                <div key={f.id}>
                  <Label className="text-xs">{f.label}</Label>
                  <Select value={mapping[f.id] || "none"} onValueChange={(v) => setMapping((m) => ({ ...m, [f.id]: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Sütun seçin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="rounded-md border">
              <div className="border-b bg-muted/40 px-3 py-2 text-xs font-medium">Önizleme (ilk 5 satır)</div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                    {rows.slice(0, 5).map((r, i) => (
                      <TableRow key={i}>{headers.map((h) => <TableCell key={h} className="text-xs">{String(r[h] ?? "")}</TableCell>)}</TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">{file.name} · {pdfPreview.length} okunabilir hareket {pdfParser && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-primary">{pdfParser} formatı</span>}</div>
            <div className="max-h-72 overflow-auto rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Tarih</TableHead><TableHead>Açıklama</TableHead><TableHead className="text-right">Tutar</TableHead></TableRow></TableHeader>
                <TableBody>
                  {pdfPreview.slice(0, 30).map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{t.date}</TableCell>
                      <TableCell className="text-xs">{t.description}</TableCell>
                      <TableCell className={`text-right text-xs ${t.amount >= 0 ? "text-success" : "text-destructive"}`}>{t.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {pdfPreview.length === 0 && (
              <div className="rounded-md bg-warning/10 p-3 text-xs text-warning">
                Otomatik okunabilir satır bulunamadı. Manuel giriş yapabilir veya Excel'e çevirip tekrar deneyebilirsiniz.
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); reset(); }} disabled={loading}>İptal</Button>
          {file && (
            <>
              <Button variant="ghost" onClick={reset}>Dosyayı Değiştir</Button>
              <Button className="gradient-primary text-primary-foreground"
                onClick={kind === "pdf" ? applyPdf : applyExcel} disabled={loading}>
                Aktar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
