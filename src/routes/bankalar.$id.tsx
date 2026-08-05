import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, ArrowUpDown, Download, Landmark, Loader2, Plus, Trash2, Upload, X,
} from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/lib/mock-data";
import { EmptyState } from "@/components/empty-state";
import { ImportStatementDialog } from "@/components/bank/import-statement-dialog";
import { bankDef, codeFromName } from "@/lib/banks/registry";
import {
  addTransaction, deleteStatement, deleteTransactions, fetchBanks, fetchStatements,
  fetchTransactions, statementUrl, updateTransaction, type StatementRow, type TxRow,
} from "@/lib/banks/service";

export const Route = createFileRoute("/bankalar/$id")({
  head: () => ({
    meta: [
      { title: "Banka Hareketleri — Fintra" },
      { name: "description", content: "Banka ekstresindeki tüm hareketleri satır satır görüntüleyin ve düzenleyin." },
      { property: "og:title", content: "Banka Hareketleri — Fintra" },
      { property: "og:description", content: "Ekstre hareketleri, filtreleme ve manuel düzenleme." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const trDate = (d?: string | null) => (d ? d.split("-").reverse().join(".") : "—");

type Filters = {
  from: string; to: string; desc: string; txNo: string;
  amountMin: string; amountMax: string; kind: "all" | "debit" | "credit";
  balanceMin: string; statementId: string;
};

const EMPTY_F: Filters = {
  from: "", to: "", desc: "", txNo: "", amountMin: "", amountMax: "", kind: "all", balanceMin: "", statementId: "all",
};

function Page() {
  const { id } = useParams({ from: "/bankalar/$id" });
  const qc = useQueryClient();

  const banksQ = useQuery({ queryKey: ["banks"], queryFn: fetchBanks });
  const bank = banksQ.data?.find((b) => b.id === id);
  const def = bank ? bankDef(bank.bank_code ?? codeFromName(bank.name)) : undefined;
  const layout = def?.layout ?? "halkbank";

  const txQ = useQuery({ queryKey: ["bank-tx", id], queryFn: () => fetchTransactions(id), enabled: !!id });
  const stQ = useQuery({ queryKey: ["bank-stmts", id], queryFn: () => fetchStatements(id), enabled: !!id });

  const [f, setF] = useState<Filters>(EMPTY_F);
  const [asc, setAsc] = useState(true);
  const [sel, setSel] = useState<string[]>([]);
  const [detail, setDetail] = useState<TxRow | null>(null);
  const [editing, setEditing] = useState<TxRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [upload, setUpload] = useState(false);

  const set = (k: keyof Filters, v: string) => setF((p) => ({ ...p, [k]: v }));

  const rows = useMemo(() => {
    const all = txQ.data ?? [];
    const out = all.filter((t) => {
      if (f.from && t.date < f.from) return false;
      if (f.to && t.date > f.to) return false;
      if (f.desc && !t.description.toLocaleLowerCase("tr-TR").includes(f.desc.toLocaleLowerCase("tr-TR"))) return false;
      if (f.txNo && !(t.doc_no ?? "").includes(f.txNo)) return false;
      const amount = Number(t.credit) - Number(t.debit);
      if (f.amountMin && Math.abs(amount) < Number(f.amountMin)) return false;
      if (f.amountMax && Math.abs(amount) > Number(f.amountMax)) return false;
      if (f.kind === "debit" && Number(t.debit) <= 0) return false;
      if (f.kind === "credit" && Number(t.credit) <= 0) return false;
      if (f.balanceMin && Number(t.balance ?? 0) < Number(f.balanceMin)) return false;
      if (f.statementId !== "all" && t.statement_id !== f.statementId) return false;
      return true;
    });
    return asc ? out : [...out].reverse();
  }, [txQ.data, f, asc]);

  const totals = useMemo(() => ({
    inn: rows.reduce((a, t) => a + Number(t.credit || 0), 0),
    out: rows.reduce((a, t) => a + Number(t.debit || 0), 0),
  }), [rows]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["bank-tx", id] });
    void qc.invalidateQueries({ queryKey: ["bank-stmts", id] });
    void qc.invalidateQueries({ queryKey: ["bank-agg"] });
  };

  const removeSelected = async () => {
    if (!sel.length) return;
    try {
      await deleteTransactions(sel);
      toast.success(`${sel.length} hareket silindi`);
      setSel([]);
      refresh();
    } catch (e) {
      toast.error("Silinemedi", { description: (e as Error).message });
    }
  };

  const removeStatement = async (s: StatementRow) => {
    try {
      await deleteStatement(s);
      toast.success("Ekstre ve hareketleri silindi");
      refresh();
    } catch (e) {
      toast.error("Silinemedi", { description: (e as Error).message });
    }
  };

  if (banksQ.isLoading) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!bank) {
    return (
      <EmptyState icon={Landmark} title="Banka bulunamadı" desc="Bu banka silinmiş olabilir."
        action={<Button asChild><Link to="/bankalar">Bankalara dön</Link></Button>} />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/bankalar"><ArrowLeft className="h-4 w-4" /></Link></Button>
          {bank.logo_url ? (
            <img src={bank.logo_url} alt={`${bank.name} logosu`} className="h-10 w-10 rounded object-contain" />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded" style={{ background: `${def?.color ?? "#64748b"}22` }}>
              <Landmark className="h-5 w-5" style={{ color: def?.color ?? "#64748b" }} />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">{bank.name} — Hareketler</h1>
            <p className="text-xs text-muted-foreground">
              {bank.account_name || "—"} {bank.branch ? `• ${bank.branch}` : ""} {bank.iban ? `• ${bank.iban}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setAsc((v) => !v)}>
            <ArrowUpDown className="mr-2 h-4 w-4" />{asc ? "Eski → Yeni" : "Yeni → Eski"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="mr-2 h-4 w-4" />Yeni Hareket
          </Button>
          <Button size="sm" onClick={() => setUpload(true)}>
            <Upload className="mr-2 h-4 w-4" />Ekstre Yükle
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1.5"><Label className="text-xs">Başlangıç</Label>
            <Input type="date" value={f.from} onChange={(e) => set("from", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Bitiş</Label>
            <Input type="date" value={f.to} onChange={(e) => set("to", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Açıklama</Label>
            <Input value={f.desc} onChange={(e) => set("desc", e.target.value)} placeholder="EFT, FAST…" /></div>
          <div className="grid gap-1.5"><Label className="text-xs">İşlem No</Label>
            <Input value={f.txNo} onChange={(e) => set("txNo", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Min Tutar</Label>
            <Input type="number" value={f.amountMin} onChange={(e) => set("amountMin", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Maks Tutar</Label>
            <Input type="number" value={f.amountMax} onChange={(e) => set("amountMax", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Tür</Label>
            <Select value={f.kind} onValueChange={(v) => set("kind", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="debit">Borç (çıkış)</SelectItem>
                <SelectItem value="credit">Alacak (giriş)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5"><Label className="text-xs">Ekstre (dosya)</Label>
            <Select value={f.statementId} onValueChange={(v) => set("statementId", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm ekstreler</SelectItem>
                {(stQ.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.file_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <Button variant="ghost" size="sm" onClick={() => setF(EMPTY_F)}><X className="mr-2 h-4 w-4" />Filtreleri temizle</Button>
            <span className="text-xs text-muted-foreground">
              {rows.length} hareket • Giriş <b className="text-emerald-500">{fmt(totals.inn)}</b> • Çıkış <b className="text-rose-500">{fmt(totals.out)}</b>
            </span>
            {!!sel.length && (
              <Button variant="destructive" size="sm" className="ml-auto" onClick={removeSelected}>
                <Trash2 className="mr-2 h-4 w-4" />{sel.length} hareketi sil
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {txQ.isLoading ? (
            <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <div className="p-10"><EmptyState icon={Landmark} title="Hareket yok" desc="Ekstre yükleyin veya manuel hareket ekleyin." /></div>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={sel.length > 0 && sel.length === rows.length}
                        onCheckedChange={(c) => setSel(c ? rows.map((r) => r.id) : [])}
                      />
                    </TableHead>
                    <TableHead className="w-28">Tarih</TableHead>
                    {layout === "vakifbank" && <TableHead className="w-16">Saat</TableHead>}
                    {layout === "vakifbank" && <TableHead className="w-28">İşlem No</TableHead>}
                    <TableHead className="min-w-[280px]">{layout === "vakifbank" ? "İşlem Adı" : "Açıklama"}</TableHead>
                    {layout === "vakifbank" ? (
                      <TableHead className="w-32 text-right">Miktar</TableHead>
                    ) : (
                      <>
                        <TableHead className="w-28 text-right">Borç</TableHead>
                        <TableHead className="w-28 text-right">Alacak</TableHead>
                      </>
                    )}
                    <TableHead className="w-32 text-right">Bakiye</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((t) => {
                    const amount = Number(t.credit) - Number(t.debit);
                    return (
                      <TableRow key={t.id} className="cursor-pointer" onClick={() => setDetail(t)}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={sel.includes(t.id)}
                            onCheckedChange={(c) =>
                              setSel((p) => (c ? [...p, t.id] : p.filter((x) => x !== t.id)))
                            }
                          />
                        </TableCell>
                        <TableCell className="tabular-nums">{trDate(t.date)}</TableCell>
                        {layout === "vakifbank" && <TableCell className="text-xs">{t.tx_time ?? "—"}</TableCell>}
                        {layout === "vakifbank" && <TableCell className="text-xs">{t.doc_no ?? "—"}</TableCell>}
                        <TableCell className="text-xs">
                          {t.description}
                          {t.source === "Manuel" && <Badge variant="outline" className="ml-2 text-[10px]">Manuel</Badge>}
                        </TableCell>
                        {layout === "vakifbank" ? (
                          <TableCell className={`text-right tabular-nums ${amount < 0 ? "text-rose-500" : "text-emerald-500"}`}>
                            {fmt(amount)}
                          </TableCell>
                        ) : (
                          <>
                            <TableCell className="text-right tabular-nums text-rose-500">
                              {Number(t.debit) ? fmt(Number(t.debit)) : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-emerald-500">
                              {Number(t.credit) ? fmt(Number(t.credit)) : "—"}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {t.balance != null ? fmt(Number(t.balance)) : "—"}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" onClick={() => setEditing(t)}>
                            <Plus className="hidden" />
                            <span className="text-xs">Düzenle</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          <h2 className="font-semibold">İçe Aktarma Geçmişi</h2>
          {(stQ.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz ekstre yüklenmedi.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dosya</TableHead>
                    <TableHead className="w-40">Dönem</TableHead>
                    <TableHead className="w-24 text-right">Hareket</TableHead>
                    <TableHead className="w-36">Yüklenme</TableHead>
                    <TableHead className="w-40" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stQ.data ?? []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{s.file_name}</TableCell>
                      <TableCell className="text-xs">{trDate(s.period_start)} → {trDate(s.period_end)}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.tx_count}</TableCell>
                      <TableCell className="text-xs">{new Date(s.created_at).toLocaleString("tr-TR")}</TableCell>
                      <TableCell className="space-x-1 text-right">
                        <Button size="sm" variant="ghost" onClick={() => set("statementId", s.id)}>Hareketleri</Button>
                        <Button size="sm" variant="ghost" onClick={async () => {
                          try { window.open(await statementUrl(s.file_path), "_blank"); }
                          catch (e) { toast.error("İndirilemedi", { description: (e as Error).message }); }
                        }}><Download className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeStatement(s)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ImportStatementDialog open={upload} onOpenChange={setUpload} bank={bank} onDone={refresh} />

      <TxDialog
        open={adding || !!editing}
        tx={editing}
        layout={layout}
        onOpenChange={(o) => { if (!o) { setAdding(false); setEditing(null); } }}
        onSave={async (v) => {
          try {
            if (editing) await updateTransaction(editing.id, v);
            else await addTransaction(id, v);
            toast.success("Kaydedildi");
            setAdding(false); setEditing(null);
            refresh();
          } catch (e) {
            toast.error("Kaydedilemedi", { description: (e as Error).message });
          }
        }}
      />

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Hareket Detayı</DialogTitle></DialogHeader>
          {detail && (
            <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Banka</dt><dd>{bank.name}</dd>
              <dt className="text-muted-foreground">Dosya Adı</dt><dd className="break-all">{detail.file_name ?? "Manuel"}</dd>
              <dt className="text-muted-foreground">Tarih</dt><dd>{trDate(detail.date)}</dd>
              <dt className="text-muted-foreground">Saat</dt><dd>{detail.tx_time ?? "—"}</dd>
              <dt className="text-muted-foreground">İşlem No</dt><dd>{detail.doc_no ?? "—"}</dd>
              <dt className="text-muted-foreground">Açıklama</dt><dd>{detail.description}</dd>
              <dt className="text-muted-foreground">Tutar</dt><dd>{fmt(Number(detail.credit) - Number(detail.debit))}</dd>
              <dt className="text-muted-foreground">Borç</dt><dd>{fmt(Number(detail.debit))}</dd>
              <dt className="text-muted-foreground">Alacak</dt><dd>{fmt(Number(detail.credit))}</dd>
              <dt className="text-muted-foreground">Bakiye</dt><dd>{detail.balance != null ? fmt(Number(detail.balance)) : "—"}</dd>
              <dt className="text-muted-foreground">İçe Aktarma</dt>
              <dd>{new Date(detail.imported_at ?? detail.created_at).toLocaleString("tr-TR")}</dd>
            </dl>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(detail); setDetail(null); }}>Düzenle</Button>
            <Button onClick={() => setDetail(null)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type TxForm = {
  date: string; tx_time: string; doc_no: string; description: string;
  debit: string; credit: string; balance: string;
};

function TxDialog({
  open, tx, layout, onOpenChange, onSave,
}: {
  open: boolean;
  tx: TxRow | null;
  layout: "halkbank" | "vakifbank";
  onOpenChange: (o: boolean) => void;
  onSave: (v: {
    date: string; tx_time: string | null; doc_no: string | null; description: string;
    debit: number; credit: number; balance: number | null;
  }) => Promise<void>;
}) {
  const initial: TxForm = {
    date: tx?.date ?? new Date().toISOString().slice(0, 10),
    tx_time: tx?.tx_time ?? "",
    doc_no: tx?.doc_no ?? "",
    description: tx?.description ?? "",
    debit: tx ? String(tx.debit ?? 0) : "",
    credit: tx ? String(tx.credit ?? 0) : "",
    balance: tx?.balance != null ? String(tx.balance) : "",
  };
  const [form, setForm] = useState<TxForm>(initial);
  const [key, setKey] = useState("");
  const currentKey = `${open}-${tx?.id ?? "new"}`;
  if (key !== currentKey) { setKey(currentKey); setForm(initial); }

  const set = (k: keyof TxForm, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.date || !form.description.trim()) { toast.error("Tarih ve açıklama zorunlu"); return; }
    setBusy(true);
    await onSave({
      date: form.date,
      tx_time: form.tx_time || null,
      doc_no: form.doc_no || null,
      description: form.description.trim(),
      debit: Number(form.debit || 0),
      credit: Number(form.credit || 0),
      balance: form.balance === "" ? null : Number(form.balance),
    });
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{tx ? "Hareketi Düzenle" : "Yeni Hareket"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5"><Label>Tarih</Label>
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Saat</Label>
            <Input type="time" value={form.tx_time} onChange={(e) => set("tx_time", e.target.value)} /></div>
          <div className="sm:col-span-2 grid gap-1.5"><Label>İşlem No</Label>
            <Input value={form.doc_no} onChange={(e) => set("doc_no", e.target.value)} /></div>
          <div className="sm:col-span-2 grid gap-1.5">
            <Label>{layout === "vakifbank" ? "İşlem Adı" : "Açıklama"}</Label>
            <Input value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid gap-1.5"><Label>Borç (çıkış)</Label>
            <Input type="number" step="0.01" value={form.debit} onChange={(e) => set("debit", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Alacak (giriş)</Label>
            <Input type="number" step="0.01" value={form.credit} onChange={(e) => set("credit", e.target.value)} /></div>
          <div className="sm:col-span-2 grid gap-1.5"><Label>Bakiye</Label>
            <Input type="number" step="0.01" value={form.balance} onChange={(e) => set("balance", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Vazgeç</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
