import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Landmark, Plus, Trash2, Upload, ListOrdered, Pencil, RefreshCw, Loader2,
  ArrowDownLeft, ArrowUpRight, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/lib/mock-data";
import { EmptyState } from "@/components/empty-state";
import { BankFormDialog } from "@/components/bank/bank-form-dialog";
import { ImportStatementDialog } from "@/components/bank/import-statement-dialog";
import { bankDef, codeFromName } from "@/lib/banks/registry";
import { deleteBank, fetchBanks, type BankRow } from "@/lib/banks/service";
import { supabase } from "@/integrations/supabase/client";

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

type Agg = { count: number; inn: number; out: number; balance: number | null };

function Page() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BankRow | null>(null);
  const [uploadFor, setUploadFor] = useState<BankRow | null>(null);
  const [deleting, setDeleting] = useState<BankRow | null>(null);

  const banksQ = useQuery({ queryKey: ["banks"], queryFn: fetchBanks });
  const banks = banksQ.data ?? [];

  const aggQ = useQuery({
    queryKey: ["bank-agg"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_transactions")
        .select("bank_id,debit,credit,balance,date")
        .is("deleted_at", null)
        .order("date", { ascending: true })
        .limit(20000);
      if (error) throw error;
      const map: Record<string, Agg> = {};
      for (const r of (data ?? []) as { bank_id: string; debit: number; credit: number; balance: number | null }[]) {
        const a = (map[r.bank_id] ??= { count: 0, inn: 0, out: 0, balance: null });
        a.count++;
        a.inn += Number(r.credit || 0);
        a.out += Number(r.debit || 0);
        if (r.balance != null) a.balance = Number(r.balance);
      }
      return map;
    },
  });
  const agg = aggQ.data ?? {};

  const totals = useMemo(() => {
    const list = Object.values(agg);
    return {
      count: list.reduce((a, x) => a + x.count, 0),
      inn: list.reduce((a, x) => a + x.inn, 0),
      out: list.reduce((a, x) => a + x.out, 0),
      balance: banks.reduce((a, b) => a + Number(agg[b.id]?.balance ?? b.current_balance ?? 0), 0),
    };
  }, [agg, banks]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["banks"] });
    void qc.invalidateQueries({ queryKey: ["bank-agg"] });
    void qc.invalidateQueries({ queryKey: ["bank-summaries"] });
  };

  const doDelete = async () => {
    if (!deleting) return;
    try {
      await deleteBank(deleting.id);
      toast.success("Banka ve tüm hareketleri silindi");
      setDeleting(null);
      refresh();
    } catch (e) {
      toast.error("Silinemedi", { description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bankalar"
        subtitle="Banka hesaplarınızı yönetin, ekstre yükleyin ve tüm hareketleri görüntüleyin."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="mr-2 h-4 w-4" />Yenile
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />Banka Ekle
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={<Landmark className="h-4 w-4" />} label="Banka" value={String(banks.length)} />
        <SummaryCard icon={<ListOrdered className="h-4 w-4" />} label="Hareket" value={String(totals.count)} />
        <SummaryCard icon={<ArrowDownLeft className="h-4 w-4 text-emerald-500" />} label="Toplam Giriş" value={fmt(totals.inn)} />
        <SummaryCard icon={<ArrowUpRight className="h-4 w-4 text-rose-500" />} label="Toplam Çıkış" value={fmt(totals.out)} />
      </div>

      {banksQ.isLoading ? (
        <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : banks.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Henüz banka yok"
          desc="Banka ekleyerek ekstre yüklemeye başlayın."
          action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="mr-2 h-4 w-4" />Banka Ekle</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {banks.map((b) => {
            const def = bankDef(b.bank_code ?? codeFromName(b.name));
            const a = agg[b.id];
            return (
              <Card key={b.id} className="overflow-hidden">
                <div className="h-1.5" style={{ background: def?.color ?? "hsl(var(--primary))" }} />
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={`${b.name} logosu`} className="h-10 w-10 rounded object-contain" />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded" style={{ background: `${def?.color ?? "#64748b"}22` }}>
                        <Landmark className="h-5 w-5" style={{ color: def?.color ?? "#64748b" }} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold">{b.name}</h3>
                        {def ? <Badge variant="secondary" className="text-[10px]">{def.label}</Badge> : (
                          <Badge variant="outline" className="text-[10px]">okuyucu yok</Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {b.account_name || "—"} {b.branch ? `• ${b.branch}` : ""}
                      </p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{b.iban || b.account_no || "—"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/40 p-2 text-center text-xs">
                    <div>
                      <p className="text-muted-foreground">Hareket</p>
                      <p className="font-semibold tabular-nums">{a?.count ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Giriş</p>
                      <p className="font-semibold tabular-nums text-emerald-500">{fmt(a?.inn ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Çıkış</p>
                      <p className="font-semibold tabular-nums text-rose-500">{fmt(a?.out ?? 0)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground"><Wallet className="h-3.5 w-3.5" />Güncel bakiye</span>
                    <span className="font-semibold tabular-nums">{fmt(Number(a?.balance ?? b.current_balance ?? 0))}</span>
                  </div>
                  {b.last_statement_date && (
                    <p className="text-[11px] text-muted-foreground">Son ekstre: {b.last_statement_date.split("-").reverse().join(".")}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={() => setUploadFor(b)}>
                      <Upload className="mr-2 h-4 w-4" />Ekstre Yükle
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/bankalar/$id" params={{ id: b.id }}>
                        <ListOrdered className="mr-2 h-4 w-4" />Hareketler
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(b); setFormOpen(true); }}>
                      <Pencil className="mr-2 h-4 w-4" />Düzenle
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleting(b)}>
                      <Trash2 className="mr-2 h-4 w-4" />Sil
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BankFormDialog open={formOpen} onOpenChange={setFormOpen} bank={editing} onSaved={refresh} />
      {uploadFor && (
        <ImportStatementDialog
          open={!!uploadFor}
          onOpenChange={(o) => !o && setUploadFor(null)}
          bank={uploadFor}
          onDone={refresh}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleting?.name} silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu bankaya ait tüm hareketler ve yüklenmiş ekstreler kalıcı olarak silinir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-muted">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
