import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, ArrowDownLeft, ArrowUpRight, Pencil, Plus, Trash2,
  ChevronLeft, ChevronRight, Search, ArrowUpDown, ChevronDown,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { fmt, type BankTx } from "@/lib/mock-data";
import { useStore, bankBalance } from "@/lib/store";
import { useSelection } from "@/hooks/use-selection";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/bankalar/$id")({
  head: () => ({ meta: [{ title: "İşlem Hareketleri — Fintra" }] }),
  component: Page,
});

type Form = {
  bankId: string; date: string; description: string; category: string;
  type: "in" | "out"; amount: number;
};

type ManualForm = { date: string; amount: string; description: string };

type SortDir = "desc" | "asc";

function parseAmount(s: string): number {
  const cleaned = s.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return isNaN(n) ? NaN : n;
}

function Page() {
  const { id } = useParams({ from: "/bankalar/$id" });
  const isMobile = useIsMobile();

  const banks = useStore((s) => s.banks);
  const bank = banks.find((b) => b.id === id);
  const tx = useStore((s) => s.bankTx.filter((t) => t.bankId === id));
  const addBankTx = useStore((s) => s.addBankTx);
  const updateBankTx = useStore((s) => s.updateBankTx);
  const removeBankTx = useStore((s) => s.removeBankTx);
  const bulkRemoveBankTx = useStore((s) => s.bulkRemoveBankTx);

  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<BankTx | null>(null);
  const emptyManual = (): ManualForm => ({
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    description: "",
  });
  const [form, setForm] = useState<ManualForm>(emptyManual());

  // ---- Filters, sort, pagination ----
  const [search, setSearch] = useState("");
  const [refNoQuery, setRefNoQuery] = useState("");
  const [amountQuery, setAmountQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [flow, setFlow] = useState<"all" | "in" | "out">("all");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const r = refNoQuery.trim().toLowerCase();
    const a = amountQuery.trim() ? Number(amountQuery.replace(",", ".")) : NaN;
    return tx.filter((t) => {
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      if (flow === "in" && t.amount <= 0) return false;
      if (flow === "out" && t.amount >= 0) return false;
      if (s && !(t.description || "").toLowerCase().includes(s) &&
          !(t.operation || "").toLowerCase().includes(s) &&
          !(t.category || "").toLowerCase().includes(s)) return false;
      if (r && !(t.refNo || "").toLowerCase().includes(r)) return false;
      if (!isNaN(a) && Math.abs(Math.abs(t.amount) - Math.abs(a)) > 0.005) return false;
      return true;
    });
  }, [tx, search, refNoQuery, amountQuery, dateFrom, dateTo, flow]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const ka = `${a.date} ${a.time || "00:00"}`;
      const kb = `${b.date} ${b.time || "00:00"}`;
      return sortDir === "desc" ? (ka < kb ? 1 : -1) : (ka > kb ? 1 : -1);
    });
    return arr;
  }, [filtered, sortDir]);

  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = sorted.slice(pageStart, pageStart + pageSize);

  const sel = useSelection(pageRows);

  const totals = useMemo(() => {
    let inn = 0, out = 0;
    for (const t of filtered) { if (t.amount >= 0) inn += t.amount; else out += -t.amount; }
    return { inn, out, net: inn - out };
  }, [filtered]);

  if (!bank) {
    return (
      <div className="space-y-6">
        <PageHeader title="Bulunamadı" />
        <Link to="/bankalar"><Button variant="outline"><ArrowLeft className="mr-1 h-4 w-4" /> Bankalar</Button></Link>
      </div>
    );
  }

  const save = () => {
    if (!form.amount) return toast.error("Tutar girin");
    addBankTx({
      bankId: form.bankId, date: form.date, description: form.description || "—",
      category: form.category || undefined,
      amount: form.type === "in" ? Math.abs(form.amount) : -Math.abs(form.amount),
    });
    setOpenNew(false); setForm(emptyForm());
    toast.success("Hareket eklendi");
  };

  const saveEdit = () => {
    if (!editing) return;
    updateBankTx(editing.id, editing);
    setEditing(null);
    toast.success("Güncellendi");
  };

  const resetFilters = () => {
    setSearch(""); setRefNoQuery(""); setAmountQuery("");
    setDateFrom(""); setDateTo(""); setFlow("all"); setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${bank.name} — İşlem Hareketleri`}
        subtitle={bank.iban || "IBAN yok"}
        actions={
          <>
            <Link to="/bankalar"><Button variant="outline" size="sm"><ArrowLeft className="mr-1 h-4 w-4" /> Geri</Button></Link>
            <Dialog open={openNew} onOpenChange={(v) => { setOpenNew(v); if (v) setForm(emptyForm()); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
                  <Plus className="mr-1 h-4 w-4" /> Yeni Hareket
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Yeni Hareket</DialogTitle></DialogHeader>
                <TxForm value={form} onChange={setForm} banks={banks} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenNew(false)}>İptal</Button>
                  <Button onClick={save} className="gradient-primary text-primary-foreground">Kaydet</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="glass"><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Güncel Bakiye</div>
          <div className="text-xl font-bold">{fmt(bankBalance(id), bank.currency)}</div>
        </CardContent></Card>
        <Card className="glass"><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Toplam Gelen</div>
          <div className="text-xl font-bold text-success">{fmt(totals.inn, bank.currency)}</div>
        </CardContent></Card>
        <Card className="glass"><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Toplam Giden</div>
          <div className="text-xl font-bold text-destructive">{fmt(totals.out, bank.currency)}</div>
        </CardContent></Card>
        <Card className="glass"><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Toplam İşlem</div>
          <div className="text-xl font-bold">{tx.length.toLocaleString("tr-TR")}</div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card className="glass">
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-2 md:grid-cols-6">
            <div className="md:col-span-2 relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Açıklama / İşlem adı ara" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Input placeholder="İşlem No" value={refNoQuery} onChange={(e) => { setRefNoQuery(e.target.value); setPage(1); }} />
            <Input placeholder="Tutar" inputMode="decimal" value={amountQuery} onChange={(e) => { setAmountQuery(e.target.value); setPage(1); }} />
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={flow} onValueChange={(v) => { setFlow(v as "all" | "in" | "out"); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="in">Sadece Gelen</SelectItem>
                <SelectItem value="out">Sadece Giden</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}>
              <ArrowUpDown className="mr-1 h-4 w-4" />
              {sortDir === "desc" ? "En Yeni" : "En Eski"}
            </Button>
            <Button variant="ghost" size="sm" onClick={resetFilters}>Filtreleri Temizle</Button>
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <span>Toplam <b className="text-foreground">{totalCount.toLocaleString("tr-TR")}</b> işlem</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 / sayfa</SelectItem>
                  <SelectItem value="50">50 / sayfa</SelectItem>
                  <SelectItem value="100">100 / sayfa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {sel.selectedIds.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
          <span className="text-xs text-muted-foreground">{sel.selectedIds.length} hareket seçili</span>
          <Button variant="destructive" size="sm"
            onClick={() => { bulkRemoveBankTx(sel.selectedIds); sel.clear(); toast.success("Silindi"); }}>
            <Trash2 className="mr-1 h-4 w-4" /> Sil
          </Button>
        </div>
      )}

      {/* Data */}
      {isMobile ? (
        <MobileList
          rows={pageRows}
          currency={bank.currency}
          selected={sel.selected}
          onToggle={sel.toggle}
          onEdit={setEditing}
          onDelete={(id2) => { removeBankTx(id2); toast.success("Silindi"); }}
        />
      ) : (
        <Card className="glass"><CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={sel.allChecked ? true : sel.someChecked ? "indeterminate" : false}
                      onCheckedChange={sel.toggleAll}
                    />
                  </TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Saat</TableHead>
                  <TableHead>İşlem No</TableHead>
                  <TableHead>İşlem Adı</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="text-right">Para Girişi</TableHead>
                  <TableHead className="text-right">Para Çıkışı</TableHead>
                  <TableHead className="text-right">Bakiye</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                    Kayıt bulunamadı
                  </TableCell></TableRow>
                )}
                {pageRows.map((t) => (
                  <TableRow key={t.id} data-state={sel.selected.has(t.id) ? "selected" : undefined}>
                    <TableCell><Checkbox checked={sel.selected.has(t.id)} onCheckedChange={() => sel.toggle(t.id)} /></TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{t.date}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{t.time || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{t.refNo || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{t.operation || t.category || "—"}</TableCell>
                    <TableCell className="max-w-[360px] truncate" title={t.description}>{t.description}</TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      {t.amount > 0 ? <span className="inline-flex items-center gap-1"><ArrowDownLeft className="h-3.5 w-3.5" />{fmt(t.amount, bank.currency)}</span> : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      {t.amount < 0 ? <span className="inline-flex items-center gap-1"><ArrowUpRight className="h-3.5 w-3.5" />{fmt(-t.amount, bank.currency)}</span> : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {typeof t.balance === "number" ? fmt(t.balance, bank.currency) : "—"}
                    </TableCell>
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
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent></Card>
      )}

      {/* Pagination */}
      <Pagination
        page={currentPage}
        pageSize={pageSize}
        total={totalCount}
        onChange={setPage}
      />

      {/* Edit dialog */}
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
              }}
              onChange={(f) => setEditing({
                ...editing, bankId: f.bankId, date: f.date, description: f.description,
                category: f.category || undefined,
                amount: f.type === "in" ? Math.abs(f.amount) : -Math.abs(f.amount),
              })}
              banks={banks}
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

function MobileList({
  rows, currency, selected, onToggle, onEdit, onDelete,
}: {
  rows: BankTx[]; currency: string; selected: Set<string>;
  onToggle: (id: string) => void; onEdit: (t: BankTx) => void; onDelete: (id: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (rows.length === 0) {
    return <Card className="glass"><CardContent className="p-8 text-center text-sm text-muted-foreground">Kayıt bulunamadı</CardContent></Card>;
  }
  return (
    <div className="space-y-2">
      {rows.map((t) => {
        const open = openId === t.id;
        return (
          <Card key={t.id} className="glass">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Checkbox className="mt-1" checked={selected.has(t.id)} onCheckedChange={() => onToggle(t.id)} />
                <div className="min-w-0 flex-1" onClick={() => setOpenId(open ? null : t.id)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">{t.date}{t.time ? ` • ${t.time}` : ""}</div>
                    <div className={`text-sm font-semibold ${t.amount >= 0 ? "text-success" : "text-destructive"}`}>
                      {t.amount >= 0 ? "+" : "-"}{fmt(Math.abs(t.amount), currency)}
                    </div>
                  </div>
                  <div className="mt-1 truncate text-sm">{t.description || "—"}</div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="truncate">{t.operation || t.category || ""}</span>
                    <span>{typeof t.balance === "number" ? `Bakiye: ${fmt(t.balance, currency)}` : ""}</span>
                  </div>
                  {open && (
                    <div className="mt-2 grid grid-cols-2 gap-1 border-t pt-2 text-[11px] text-muted-foreground">
                      <div>İşlem No: <span className="font-mono text-foreground">{t.refNo || "—"}</span></div>
                      <div>Kategori: <span className="text-foreground">{t.category || "—"}</span></div>
                    </div>
                  )}
                </div>
                <button className="text-muted-foreground" onClick={() => setOpenId(open ? null : t.id)}>
                  <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
                </button>
              </div>
              {open && (
                <div className="mt-2 flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(t)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Pagination({
  page, pageSize, total, onChange,
}: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const nums: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) nums.push(i);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">
        {from.toLocaleString("tr-TR")} – {to.toLocaleString("tr-TR")} / {total.toLocaleString("tr-TR")}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {start > 1 && <span className="px-1 text-xs text-muted-foreground">…</span>}
        {nums.map((n) => (
          <Button key={n} variant={n === page ? "default" : "outline"} size="sm" onClick={() => onChange(n)}>
            {n}
          </Button>
        ))}
        {end < totalPages && <span className="px-1 text-xs text-muted-foreground">…</span>}
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function TxForm({
  value, onChange, banks,
}: { value: Form; onChange: (v: Form) => void; banks: { id: string; name: string }[] }) {
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
          <Label>Tip</Label>
          <Select value={value.type} onValueChange={(v) => set({ type: v as "in" | "out" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in">Gelen (Giriş)</SelectItem>
              <SelectItem value="out">Giden (Çıkış)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tutar</Label>
          <Input type="number" value={value.amount} onChange={(e) => set({ amount: +e.target.value })} />
        </div>
      </div>
      <div><Label>Ödeme Yapılan Firma / Açıklama</Label>
        <Input value={value.description} onChange={(e) => set({ description: e.target.value })} /></div>
      <div><Label>Kategori</Label>
        <Input value={value.category} onChange={(e) => set({ category: e.target.value })} placeholder="İsteğe bağlı" /></div>
    </div>
  );
}

// suppress unused imports warning
void Badge;
