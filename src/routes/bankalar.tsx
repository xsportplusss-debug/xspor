import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Landmark, Plus, Trash2, Upload, Loader2, RefreshCw, Wallet,
  ArrowDownLeft, ArrowUpRight, Hash, ListOrdered,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { fmt } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UploadStatementDialog } from "@/components/bank/upload-statement-dialog";

export const Route = createFileRoute("/bankalar")({
  head: () => ({
    meta: [
      { title: "Bankalar — Fintra" },
      { name: "description", content: "Banka hesapları, ekstre yükleme ve tüm banka hareketleri." },
      { property: "og:title", content: "Bankalar — Fintra" },
      { property: "og:description", content: "Banka hesapları, ekstre yükleme ve banka hareketleri yönetimi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const COLORS = ["#00A651", "#0055A4", "#004990", "#E30613", "#7B2CBF", "#F27A1A"];

type Agg = { count: number; inn: number; out: number; last: string | null };

function Page() {
  const banks = useStore((s) => s.banks);
  const addBank = useStore((s) => s.addBank);
  const removeBank = useStore((s) => s.removeBank);
  const qc = useQueryClient();

  const [uploadBankId, setUploadBankId] = useState<string | null>(null);
  const [openBank, setOpenBank] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", iban: "", accountNo: "", currency: "TRY", color: COLORS[0], short: "",
  });

  const summary = useQuery({
    queryKey: ["bank-summary"],
    queryFn: async (): Promise<Record<string, Agg>> => {
      const map: Record<string, Agg> = {};
      const page = 1000;
      let from = 0;
      for (;;) {
        const { data, error } = await supabase
          .from("bank_transactions")
          .select("bank_id,debit,credit,date")
          .order("date", { ascending: false })
          .range(from, from + page - 1);
        if (error) throw error;
        const rows = data ?? [];
        for (const r of rows) {
          const a = (map[r.bank_id] ??= { count: 0, inn: 0, out: 0, last: null });
          a.count++;
          a.inn += Number(r.credit ?? 0);
          a.out += Number(r.debit ?? 0);
          if (!a.last || r.date > a.last) a.last = r.date;
        }
        if (rows.length < page) break;
        from += page;
      }
      return map;
    },
  });

  const aggOf = (id: string): Agg => summary.data?.[id] ?? { count: 0, inn: 0, out: 0, last: null };

  const totals = useMemo(() => {
    const list = Object.values(summary.data ?? {});
    const inn = list.reduce((a, x) => a + x.inn, 0);
    const out = list.reduce((a, x) => a + x.out, 0);
    const count = list.reduce((a, x) => a + x.count, 0);
    const opening = banks.reduce((a, b) => a + (b.balance ?? 0), 0);
    return { inn, out, count, balance: opening + inn - out };
  }, [summary.data, banks]);

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
    setForm({ name: "", iban: "", accountNo: "", currency: "TRY", color: COLORS[0], short: "" });
    setOpenBank(false);
    toast.success("Banka eklendi");
  };

  const uploadBank = banks.find((b) => b.id === uploadBankId) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bankalar"
        subtitle="Banka hesapları, ekstre yükleme ve hareket yönetimi"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                qc.invalidateQueries({ queryKey: ["bank-summary"] });
                qc.invalidateQueries({ queryKey: ["bank-tx"] });
                qc.invalidateQueries({ queryKey: ["bank-statements"] });
                toast.success("Yenilendi");
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Yenile
            </Button>
            <Button onClick={() => setOpenBank(true)}>
              <Plus className="mr-2 h-4 w-4" /> Yeni Banka
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<Wallet className="h-4 w-4" />} label="Toplam Bakiye" value={fmt(totals.balance)} />
        <SummaryCard icon={<ArrowDownLeft className="h-4 w-4 text-emerald-500" />} label="Toplam Giriş" value={fmt(totals.inn)} />
        <SummaryCard icon={<ArrowUpRight className="h-4 w-4 text-rose-500" />} label="Toplam Çıkış" value={fmt(totals.out)} />
        <SummaryCard icon={<Hash className="h-4 w-4" />} label="İşlem Sayısı" value={String(totals.count)} />
      </div>

      {banks.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Henüz banka yok"
          desc="Ekstre yüklemek için önce bir banka hesabı ekleyin."
          action={<Button onClick={() => setOpenBank(true)}><Plus className="mr-2 h-4 w-4" /> Yeni Banka</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {banks.map((b) => {
            const a = aggOf(b.id);
            const balance = (b.balance ?? 0) + a.inn - a.out;
            return (
              <Card key={b.id} className="overflow-hidden">
                <div className="h-1.5" style={{ background: b.color }} />
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-xs font-bold text-white"
                          style={{ background: b.color }}
                        >
                          {b.short}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{b.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{b.iban || b.accountNo || "—"}</p>
                        </div>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(b.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Güncel Bakiye</p>
                    <p className="text-2xl font-bold tabular-nums">{fmt(balance)}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <Metric label="Giriş" value={fmt(a.inn)} tone="text-emerald-500" />
                    <Metric label="Çıkış" value={fmt(a.out)} tone="text-rose-500" />
                    <Metric label="Hareket" value={String(a.count)} />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Son ekstre: {a.last ? new Date(a.last).toLocaleDateString("tr-TR") : "—"}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="flex-1" onClick={() => setUploadBankId(b.id)}>
                      <Upload className="mr-2 h-4 w-4" /> Ekstre Yükle
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <Link to="/bankalar/$id" params={{ id: b.id }}>
                        <ListOrdered className="mr-2 h-4 w-4" /> Hareketler
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {summary.isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Özet yükleniyor…
        </p>
      )}

      <Dialog open={openBank} onOpenChange={setOpenBank}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Yeni Banka</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Banka Adı</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VakıfBank" />
            </div>
            <div className="sm:col-span-2">
              <Label>IBAN</Label>
              <Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="TR.." />
            </div>
            <div>
              <Label>Hesap No</Label>
              <Input value={form.accountNo} onChange={(e) => setForm({ ...form, accountNo: e.target.value })} />
            </div>
            <div>
              <Label>Para Birimi</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["TRY", "USD", "EUR", "GBP"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kısa Kod</Label>
              <Input value={form.short} onChange={(e) => setForm({ ...form, short: e.target.value })} placeholder="VKF" />
            </div>
            <div>
              <Label>Renk</Label>
              <div className="flex flex-wrap gap-2 pt-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-7 w-7 rounded-full border-2 ${form.color === c ? "border-foreground" : "border-transparent"}`}
                    style={{ background: c }}
                    aria-label={`Renk ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenBank(false)}>Vazgeç</Button>
            <Button onClick={saveBank}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Banka silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu bankaya ait yerel hareketler de kaldırılır. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const id = confirmDelete!;
                setConfirmDelete(null);
                removeBank(id);
                await supabase.from("bank_transactions").delete().eq("bank_id", id);
                await supabase.from("bank_statements").delete().eq("bank_id", id);
                await supabase.from("banks").delete().eq("id", id);
                qc.invalidateQueries({ queryKey: ["bank-summary"] });
                toast.success("Banka silindi");
              }}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {uploadBank && (
        <UploadStatementDialog
          open={!!uploadBankId}
          onOpenChange={(o) => !o && setUploadBankId(null)}
          bank={uploadBank}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["bank-summary"] });
            qc.invalidateQueries({ queryKey: ["bank-tx"] });
            qc.invalidateQueries({ queryKey: ["bank-statements"] });
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tabular-nums">{value}</p>
        </div>
        <Badge variant="secondary" className="h-8 w-8 justify-center p-0">{icon}</Badge>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`truncate font-semibold tabular-nums ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
