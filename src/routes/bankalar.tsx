import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Landmark, Plus, Trash2, Upload, FileText, Loader2, Download, RefreshCw,
  Wallet, ArrowDownLeft, ArrowUpRight, Hash,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { fmt } from "@/lib/mock-data";
import type { BankTx } from "@/lib/mock-data";
import { useStore, bankBalance } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseStatement, sha256Hex, type ParsedTx } from "@/lib/statement-parsers";
import { validateStatementForBank } from "@/lib/bank-identity";
import { classify } from "@/lib/tx-classifier";

export const Route = createFileRoute("/bankalar")({
  head: () => ({
    meta: [
      { title: "Bankalar — Fintra" },
      { name: "description", content: "Banka hesapları, ekstre yükleme ve tüm banka hareketleri." },
    ],
  }),
  component: Page,
});

const COLORS = ["#00A651", "#0055A4", "#004990", "#E30613", "#7B2CBF", "#F27A1A"];

type BankStatementRow = {
  id: string;
  bank_name: string;
  account_name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  status: string;
  created_at: string;
  tx_count?: number | null;
  period_start?: string | null;
  period_end?: string | null;
  bank_id?: string | null;
};

function Page() {
  const banks = useStore((s) => s.banks);
  const bankTx = useStore((s) => s.bankTx);
  const addBank = useStore((s) => s.addBank);
  const removeBank = useStore((s) => s.removeBank);

  const qc = useQueryClient();
  const [uploadBankId, setUploadBankId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Per-bank metrics
  const metrics = useMemo(() => {
    const m: Record<string, { in: number; out: number; last: string; count: number }> = {};
    for (const b of banks) m[b.id] = { in: 0, out: 0, last: "", count: 0 };
    for (const t of bankTx) {
      const x = m[t.bankId]; if (!x) continue;
      x.count++;
      if (t.amount >= 0) x.in += t.amount; else x.out += -t.amount;
      if (!x.last || t.date > x.last) x.last = t.date;
    }
    return m;
  }, [banks, bankTx]);

  // Aggregate totals
  const totals = useMemo(() => {
    let inn = 0, out = 0;
    for (const t of bankTx) { if (t.amount >= 0) inn += t.amount; else out += -t.amount; }
    const balance = banks.reduce((a, b) => a + bankBalance(b.id), 0);
    return { balance, inn, out, count: bankTx.length };
  }, [banks, bankTx]);

  // New bank form
  const [openBank, setOpenBank] = useState(false);
  const [form, setForm] = useState({
    name: "", iban: "", accountName: "", accountNo: "",
    currency: "TRY", color: COLORS[0], short: "",
  });

  const saveBank = () => {
    if (!form.name.trim()) return toast.error("Banka adı girin");
    addBank({
      name: form.name.trim(),
      iban: form.iban.trim(),
      accountNo: form.accountNo.trim(),
      currency: form.currency,
      color: form.color,
      balance: 0,
      short: (form.short || form.name).slice(0, 4).toUpperCase(),
    });
    setForm({ name: "", iban: "", accountName: "", accountNo: "", currency: "TRY", color: COLORS[0], short: "" });
    setOpenBank(false);
    toast.success("Banka eklendi");
  };

  useEffect(() => {
    if (uploadBankId) setUploadOpen(true);
  }, [uploadBankId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bankalar"
        subtitle={`${banks.length} hesap • ${bankTx.length} hareket`}
        actions={
          <Dialog open={openBank} onOpenChange={setOpenBank}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
                <Plus className="mr-1 h-4 w-4" /> Yeni Banka
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Yeni Banka Ekle</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>Banka Adı</Label>
                  <Input placeholder="Örn. Vakıfbank" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>IBAN</Label>
                  <Input placeholder="TR.." value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Hesap Adı / Açıklama</Label>
                    <Input placeholder="Örn. TL Ticari" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} />
                  </div>
                  <div>
                    <Label>Hesap No</Label>
                    <Input value={form.accountNo} onChange={(e) => setForm({ ...form, accountNo: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Para Birimi</Label>
                    <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
                  </div>
                  <div>
                    <Label>Renk / Logo</Label>
                    <div className="mt-1 flex gap-2">
                      {COLORS.map((c) => (
                        <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                          className={`h-8 w-8 rounded-lg ring-2 ${form.color === c ? "ring-foreground" : "ring-transparent"}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenBank(false)}>İptal</Button>
                <Button onClick={saveBank} className="gradient-primary text-primary-foreground">Kaydet</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Aggregate summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={Wallet} tone="primary" label="Toplam Banka Bakiyesi" value={fmt(totals.balance)} />
        <SummaryCard icon={ArrowDownLeft} tone="success" label="Toplam Para Girişi" value={fmt(totals.inn)} />
        <SummaryCard icon={ArrowUpRight} tone="destructive" label="Toplam Para Çıkışı" value={fmt(totals.out)} />
        <SummaryCard icon={Hash} tone="info" label="Toplam İşlem Sayısı" value={totals.count.toLocaleString("tr-TR")} />
      </div>

      {banks.length === 0 ? (
        <EmptyState icon={Landmark} title="Henüz banka yok" desc="Yukarıdan Yeni Banka ekleyerek başlayın. Ardından PDF ekstresini yükleyip tüm hareketleri otomatik aktarabilirsiniz." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banks.map((b) => {
            const mm = metrics[b.id];
            return (
              <Card key={b.id} className="glass overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: b.color }} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: b.color }}>
                        <Landmark className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-semibold truncate">{b.name}</div>
                        <div className="text-[11px] font-mono text-muted-foreground truncate">{b.iban || "IBAN yok"}</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(`${b.name} ve tüm hareketleri silinsin mi?`)) removeBank(b.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  {b.accountNo && <div className="mt-1 text-[11px] text-muted-foreground">Hesap No: {b.accountNo}</div>}

                  <div className="mt-4 text-xs text-muted-foreground">Güncel Bakiye</div>
                  <div className="text-2xl font-bold tracking-tight">{fmt(bankBalance(b.id), b.currency)}</div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-md bg-success/10 p-2">
                      <div className="text-muted-foreground">Toplam Giriş</div>
                      <div className="font-semibold text-success">{fmt(mm.in, b.currency)}</div>
                    </div>
                    <div className="rounded-md bg-destructive/10 p-2">
                      <div className="text-muted-foreground">Toplam Çıkış</div>
                      <div className="font-semibold text-destructive">{fmt(mm.out, b.currency)}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                    <span>Son İşlem: {mm.last || "—"}</span>
                    <span>{mm.count} hareket</span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setUploadBankId(b.id)}>
                      <Upload className="mr-1 h-4 w-4" /> Ekstre Yükle
                    </Button>
                    <Link to="/bankalar/$id" params={{ id: b.id }} className="contents">
                      <Button size="sm" variant="outline" className="w-full">
                        <FileText className="mr-1 h-4 w-4" /> İşlem Hareketleri
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <StatementsSection onUploadClick={() => { setUploadBankId(null); setUploadOpen(true); }} />

      <UploadStatementDialog
        open={uploadOpen}
        onOpenChange={(v) => { setUploadOpen(v); if (!v) setUploadBankId(null); }}
        preselectedBankId={uploadBankId}
        onUploaded={() => { qc.invalidateQueries({ queryKey: ["bank-statements"] }); qc.invalidateQueries({ queryKey: ["bank-tx"] }); }}
      />
    </div>
  );
}

function SummaryCard({
  icon: Icon, label, value, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string;
  tone: "primary" | "success" | "destructive" | "info";
}) {
  const toneMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
  };
  return (
    <Card className="glass">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-0.5 text-lg font-bold tracking-tight truncate">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Yüklenen Ekstreler ----------

function formatSize(n: number) {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function StatementsSection({ onUploadClick }: { onUploadClick: () => void }) {
  const qc = useQueryClient();
  const removeBankTxByStatement = useStore((s) => s.removeBankTxByStatement);
  const [deleteTarget, setDeleteTarget] = useState<BankStatementRow | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["bank-statements"],
    queryFn: async (): Promise<BankStatementRow[]> => {
      const { data, error } = await supabase
        .from("bank_statements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BankStatementRow[];
    },
  });

  const list = data ?? [];

  const downloadOne = async (row: BankStatementRow) => {
    const { data: file, error } = await supabase.storage.from("bank-statements").download(row.file_path);
    if (error || !file) { toast.error(`İndirilemedi: ${error?.message ?? "bilinmeyen hata"}`); return; }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url; a.download = row.file_name;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const deleteMut = useMutation({
    mutationFn: async (row: BankStatementRow) => {
      await supabase.storage.from("bank-statements").remove([row.file_path]);
      // Remove tx rows persisted for this statement (best-effort).
      await supabase.from("bank_transactions").delete().eq("statement_id", row.id);
      const { error } = await supabase.from("bank_statements").delete().eq("id", row.id);
      if (error) throw error;
      removeBankTxByStatement(row.id);
    },
    onSuccess: () => {
      toast.success("Ekstre ve içindeki hareketler silindi");
      qc.invalidateQueries({ queryKey: ["bank-statements"] });
      qc.invalidateQueries({ queryKey: ["bank-tx"] });
    },
    onError: (e: unknown) => toast.error(`Silinemedi: ${(e as Error).message}`),
    onSettled: () => setDeleteTarget(null),
  });

  return (
    <Card className="glass">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm font-semibold">Yüklenen Ekstreler</div>
            <Badge variant="outline" className="text-[10px]">{list.length}</Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw className="mr-1 h-3.5 w-3.5" />Yenile</Button>
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={onUploadClick}>
              <Upload className="mr-1 h-3.5 w-3.5" /> Ekstre Yükle
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
          </div>
        ) : isError ? (
          <div className="p-6 text-sm text-destructive">
            Hata: {(error as Error)?.message ?? "Ekstreler yüklenemedi"}
          </div>
        ) : list.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Henüz ekstre yüklenmedi. Yukarıdan bir banka seçip <b>Ekstre Yükle</b> ile PDF ekstresini içeri aktarın.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banka</TableHead>
                  <TableHead>Dosya</TableHead>
                  <TableHead>Tarih Aralığı</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                  <TableHead>Yüklenme</TableHead>
                  <TableHead className="text-right">Aksiyon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.bank_name || "—"}</TableCell>
                    <TableCell className="max-w-[240px] truncate" title={r.file_name}>
                      <div className="truncate">{r.file_name}</div>
                      <div className="text-[11px] text-muted-foreground">{formatSize(r.file_size)}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {r.period_start && r.period_end ? `${r.period_start} → ${r.period_end}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">{r.tx_count ?? 0}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("tr-TR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {r.bank_id && (
                          <Link to="/bankalar/$id" params={{ id: r.bank_id }} search={{ statementId: r.id } as never}>
                            <Button size="icon" variant="ghost" title="Bu ekstrenin hareketleri">
                              <FileText className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        <Button size="icon" variant="ghost" title="İndir" onClick={() => downloadOne(r)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Sil" onClick={() => setDeleteTarget(r)}>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ekstre silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              <b>{deleteTarget?.file_name}</b> dosyası ve bu ekstreyle içe aktarılan tüm banka hareketleri kalıcı olarak silinecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget)}
            >
              {deleteMut.isPending ? "Siliniyor…" : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ---------- Ekstre Yükle Dialog (Preview + Duplicate) ----------

type PreviewRow = ParsedTx & {
  _dup?: boolean;
  _skip?: boolean;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function ensureBankExistsInCloud(userId: string, bank: NonNullable<ReturnType<typeof useStore.getState>["banks"][number]>) {
  if (!UUID_RE.test(bank.id)) {
    throw new Error("Banka kaydı eski formatta. Bankayı silip yeniden ekleyin veya sayfayı yenileyip tekrar deneyin.");
  }

  const { error } = await supabase.from("banks").upsert(
    {
      id: bank.id,
      user_id: userId,
      name: bank.name,
      iban: bank.iban || null,
      account_no: bank.accountNo || null,
      account_name: bank.short || bank.name,
      currency: bank.currency || "TRY",
      active: bank.active ?? true,
      current_balance: bankBalance(bank.id),
      last_statement_date: bank.lastStatementDate || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) throw error;
}

function UploadStatementDialog({
  open, onOpenChange, preselectedBankId, onUploaded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preselectedBankId: string | null;
  onUploaded: () => void;
}) {
  const banks = useStore((s) => s.banks);
  const bulkAddBankTx = useStore((s) => s.bulkAddBankTx);
  const existingBankTx = useStore((s) => s.bankTx);

  const [step, setStep] = useState<"select" | "preview" | "done">("select");
  const [bankId, setBankId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [dupCount, setDupCount] = useState(0);
  const [summary, setSummary] = useState<{ imported: number; skipped: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setStep("select");
      setBankId(preselectedBankId ?? "");
      setFile(null); setRows([]); setDupCount(0); setSummary(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [open, preselectedBankId]);

  const selectedBank = banks.find((b) => b.id === bankId);

  const analyze = async () => {
    if (!file) return toast.error("PDF dosyası seçin");
    if (!bankId) return toast.error("Banka seçin");
    setParsing(true);
    try {
      const res = await parseStatement(file);
      if (!res.transactions.length) {
        toast.error("PDF'den hareket okunamadı. Farklı bir dosya deneyin veya manuel giriş yapın.");
        setParsing(false);
        return;
      }
      // Dedupe check
      const existingKeys = new Set(
        existingBankTx
          .filter((t) => t.bankId === bankId)
          .map((t) => `${t.date}|${t.amount.toFixed(2)}|${(t.description || "").slice(0, 60).toLowerCase()}`)
      );
      let dups = 0;
      const enriched: PreviewRow[] = res.transactions.map((r) => {
        const key = `${r.date}|${r.amount.toFixed(2)}|${(r.description || "").slice(0, 60).toLowerCase()}`;
        const dup = existingKeys.has(key);
        if (dup) dups++;
        return { ...r, _dup: dup, _skip: dup };
      });
      setRows(enriched);
      setDupCount(dups);
      setStep("preview");
    } catch (e) {
      toast.error(`PDF okunamadı: ${(e as Error).message}`);
    } finally {
      setParsing(false);
    }
  };

  const updateRow = (i: number, patch: Partial<PreviewRow>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const commit = useMutation({
    mutationFn: async () => {
      if (!file || !bankId) throw new Error("Eksik bilgi");
      if (!selectedBank) throw new Error("Seçilen banka bulunamadı");
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error("Oturum bulunamadı");
      const uid = userData.user.id;

      // Compute period
      const kept = rows.filter((r) => !r._skip);
      const dates = kept.map((r) => r.date).filter(Boolean).sort();
      const periodStart = dates[0] || null;
      const periodEnd = dates[dates.length - 1] || null;
      const hash = await sha256Hex(file).catch(() => null);

      // The statement row has a foreign-key to public.banks.id. Because banks are
      // created in the local app store first, make sure the matching cloud row
      // exists before inserting bank_statements.
      await ensureBankExistsInCloud(uid, selectedBank);

      // Upload file to storage
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${uid}/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage
        .from("bank-statements")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) throw upErr;

      // Insert statement row
      const { data: stmt, error: sErr } = await supabase.from("bank_statements").insert({
        user_id: uid,
        bank_id: bankId,
        bank_name: selectedBank?.name ?? "—",
        account_name: selectedBank?.accountNo ?? "—",
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type || "application/pdf",
        status: "parsed",
        period_start: periodStart,
        period_end: periodEnd,
        file_hash: hash,
        tx_count: kept.length,
      }).select("id").single();

      if (sErr) {
        await supabase.storage.from("bank-statements").remove([path]);
        throw sErr;
      }
      const statementId = stmt.id as string;

      // Add to store
      const toAdd: Omit<BankTx, "id">[] = kept.map((r) => {
        const cls = classify(r.description, r.amount);
        return {
          bankId,
          date: r.date,
          description: r.description,
          category: cls.category,
          amount: r.amount,
          time: r.time,
          refNo: r.refNo,
          operation: r.operation,
          balance: r.balance,
          source: "PDF",
          statementId,
          statementName: file.name,
        };
      });
      bulkAddBankTx(toAdd);

      // Persist to bank_transactions so any device can list them by bank_id,
      // independent of the local store / user_data JSON blob.
      if (toAdd.length) {
        const dbRows = toAdd.map((t) => {
          const cls = classify(t.description, t.amount);
          return {
            user_id: uid,
            bank_id: bankId,
            statement_id: statementId,
            date: t.date,
            description: t.description,
            ref_no: t.refNo ?? null,
            debit: t.amount < 0 ? -t.amount : 0,
            credit: t.amount > 0 ? t.amount : 0,
            balance: t.balance ?? null,
            currency: selectedBank.currency || "TRY",
            source: "PDF",
            category: cls.category,
            direction: t.amount >= 0 ? "in" : "out",
          };
        });
        // Chunk to avoid oversized inserts
        for (let i = 0; i < dbRows.length; i += 500) {
          const chunk = dbRows.slice(i, i + 500);
          const { error: txErr } = await supabase.from("bank_transactions").insert(chunk);
          if (txErr) console.warn("bank_transactions insert failed", txErr);
        }
      }

      const finalBalance = bankBalance(bankId);
      await supabase
        .from("banks")
        .update({
          current_balance: finalBalance,
          last_statement_date: periodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bankId);

      return { imported: toAdd.length, skipped: rows.length - toAdd.length };
    },
    onSuccess: (res) => {
      setSummary(res);
      setStep("done");
      toast.success(`${res.imported} hareket aktarıldı`);
      onUploaded();
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Kaydedilemedi"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "select" && "PDF Ekstre Yükle"}
            {step === "preview" && "Ekstre Önizleme — Onayla ve Kaydet"}
            {step === "done" && "Yükleme Tamamlandı"}
          </DialogTitle>
        </DialogHeader>

        {step === "select" && (
          <>
            <div className="grid gap-3">
              <div>
                <Label>Banka</Label>
                <Select value={bankId} onValueChange={setBankId}>
                  <SelectTrigger><SelectValue placeholder="Banka seçin" /></SelectTrigger>
                  <SelectContent>
                    {banks.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>PDF Dosyası</Label>
                <Input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file && (
                  <p className="mt-1 text-xs text-muted-foreground">{file.name} — {formatSize(file.size)}</p>
                )}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Metin tabanlı PDF ekstreleri otomatik olarak analiz edilir. Farklı bankaların formatları desteklenir.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
              <Button
                className="gradient-primary text-primary-foreground"
                disabled={!file || !bankId || parsing}
                onClick={analyze}
              >
                {parsing ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Analiz ediliyor…</> : <><Upload className="mr-1 h-4 w-4" /> Analiz Et</>}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "preview" && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">{rows.length} satır algılandı</Badge>
              <Badge variant="outline" className="bg-success/10 text-success">
                {rows.filter((r) => !r._skip).length} eklenecek
              </Badge>
              {dupCount > 0 && (
                <Badge variant="outline" className="bg-warning/10 text-warning">
                  {dupCount} olası mükerrer
                </Badge>
              )}
              {dupCount > 0 && (
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="outline"
                    onClick={() => setRows((prev) => prev.map((r) => (r._dup ? { ...r, _skip: true } : r)))}>
                    Mükerrerleri Atla
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={() => setRows((prev) => prev.map((r) => ({ ...r, _skip: false })))}>
                    Hepsini Ekle
                  </Button>
                </div>
              )}
            </div>

            {dupCount > 0 && (
              <div className="rounded-md border border-warning/30 bg-warning/5 p-2 text-[11px] text-warning">
                Bu ekstredeki bazı işlemler daha önce sisteme eklenmiş olabilir. Aşağıdan istediğinizi işaretleyebilir veya düzenleyebilirsiniz.
              </div>
            )}

            <div className="flex-1 overflow-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-10">Ekle</TableHead>
                    <TableHead className="w-32">Tarih</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead className="w-28 text-right">Tutar</TableHead>
                    <TableHead className="w-28 text-right">Bakiye</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className={r._dup ? "bg-warning/5" : ""}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={!r._skip}
                          onChange={(e) => updateRow(i, { _skip: !e.target.checked })}
                          className="h-4 w-4"
                        />
                      </TableCell>
                      <TableCell>
                        <Input type="date" className="h-8 text-xs"
                          value={r.date}
                          onChange={(e) => updateRow(i, { date: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs"
                          value={r.description}
                          onChange={(e) => updateRow(i, { description: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input inputMode="decimal" className="h-8 text-xs text-right"
                          value={String(r.amount)}
                          onChange={(e) => {
                            const v = Number(e.target.value.replace(",", "."));
                            updateRow(i, { amount: isNaN(v) ? 0 : v });
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input inputMode="decimal" className="h-8 text-xs text-right"
                          value={r.balance != null ? String(r.balance) : ""}
                          onChange={(e) => {
                            const v = e.target.value.trim() === "" ? undefined : Number(e.target.value.replace(",", "."));
                            updateRow(i, { balance: v == null || isNaN(v) ? undefined : v });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {r._dup && <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning">Mükerrer?</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("select")}>Geri</Button>
              <Button
                className="gradient-primary text-primary-foreground"
                disabled={commit.isPending || rows.every((r) => r._skip)}
                onClick={() => commit.mutate()}
              >
                {commit.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Kaydediliyor…</> : "Onayla ve Kaydet"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "done" && summary && (
          <>
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>Aktarılan Hareket</span><span className="font-semibold text-success">{summary.imported}</span></div>
              <div className="flex justify-between"><span>Atlanan</span><span className="font-semibold text-muted-foreground">{summary.skipped}</span></div>
            </div>
            <DialogFooter>
              <Button className="gradient-primary text-primary-foreground" onClick={() => onOpenChange(false)}>Tamam</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
