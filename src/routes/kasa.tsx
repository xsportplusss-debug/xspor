import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Wallet, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fmt } from "@/lib/mock-data";
import { useStore, cashBalance } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/kasa")({
  head: () => ({
    meta: [
      { title: "Kasa — Fintra" },
      { name: "description", content: "Kasa bakiyeleri, giriş/çıkış hareketleri." },
    ],
  }),
  component: Page,
});

function Page() {
  const cashes = useStore((s) => s.cashRegisters);
  const addCash = useStore((s) => s.addCash);
  const removeCash = useStore((s) => s.removeCash);
  const cashTxAll = useStore((s) => s.cashTx);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "Ana Kasa", currency: "TRY", balance: 0 });

  const save = () => {
    if (!form.name) return toast.error("Kasa adı girin");
    addCash(form);
    setOpen(false);
    setForm({ name: "Ana Kasa", currency: "TRY", balance: 0 });
    toast.success("Kasa eklendi");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kasa"
        subtitle={`${cashes.length} kasa`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
                <Plus className="mr-1 h-4 w-4" /> Yeni Kasa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Yeni Kasa</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Kasa Adı</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Para Birimi</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
                  <div><Label>Açılış</Label><Input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: +e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                <Button onClick={save} className="gradient-primary text-primary-foreground">Kaydet</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {cashes.length === 0 ? (
        <EmptyState icon={Wallet} title="Henüz kasa yok" desc="Yeni kasa ekleyin, ardından giriş/çıkış hareketleri girin." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cashes.map((c) => {
            const recent = cashTxAll.filter((t) => t.cashId === c.id).slice(0, 3);
            return (
              <Card key={c.id} className="glass">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">{c.currency}</span>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Kasa ve hareketleri silinsin mi?")) removeCash(c.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 text-base font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">Güncel Bakiye</div>
                  <div className="text-2xl font-bold tracking-tight">{fmt(cashBalance(c.id), c.currency)}</div>
                  {recent.length > 0 && (
                    <div className="mt-3 space-y-1 border-t pt-3 text-xs">
                      {recent.map((t) => (
                        <div key={t.id} className="flex items-center justify-between">
                          <span className="truncate text-muted-foreground">{t.date} · {t.description}</span>
                          <span className={t.amount >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                            {t.amount >= 0 ? "+" : ""}{fmt(t.amount, c.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link to="/kasa/$id" params={{ id: c.id }}>
                    <Button variant="outline" size="sm" className="mt-3 w-full">Detay & Hareket</Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
