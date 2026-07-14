import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Landmark, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fmt } from "@/lib/mock-data";
import { useStore, bankBalance } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/bankalar")({
  head: () => ({
    meta: [
      { title: "Bankalar — Fintra" },
      { name: "description", content: "Banka hesapları ve hareketleri." },
    ],
  }),
  component: Page,
});

const COLORS = ["#00A651", "#0055A4", "#004990", "#E30613", "#7B2CBF", "#F27A1A"];

function Page() {
  const banks = useStore((s) => s.banks);
  const addBank = useStore((s) => s.addBank);
  const removeBank = useStore((s) => s.removeBank);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", short: "", iban: "", currency: "TRY", balance: 0, color: COLORS[0] });

  const save = () => {
    if (!form.name) return toast.error("Banka adı girin");
    addBank(form);
    setOpen(false);
    setForm({ name: "", short: "", iban: "", currency: "TRY", balance: 0, color: COLORS[0] });
    toast.success("Banka eklendi");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bankalar"
        subtitle={`${banks.length} hesap`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
                <Plus className="mr-1 h-4 w-4" /> Yeni Hesap
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Yeni Banka Hesabı</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2"><Label>Ad</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>Kısaltma</Label><Input value={form.short} onChange={(e) => setForm({ ...form, short: e.target.value.toUpperCase() })} /></div>
                </div>
                <div><Label>IBAN</Label><Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Para Birimi</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
                  <div><Label>Açılış Bakiyesi</Label><Input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: +e.target.value })} /></div>
                </div>
                <div>
                  <Label>Renk</Label>
                  <div className="mt-1 flex gap-2">
                    {COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                        className={`h-8 w-8 rounded-lg ring-2 ${form.color === c ? "ring-foreground" : "ring-transparent"}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
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

      {banks.length === 0 ? (
        <EmptyState icon={Landmark} title="Henüz banka hesabı yok" desc="Yeni hesap ekleyin, ardından hareket girin veya ekstre içe aktarın." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banks.map((b) => (
            <Card key={b.id} className="glass overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: b.color }} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ backgroundColor: b.color }}>
                    <Landmark className="h-5 w-5" />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Hesap ve hareketleri silinsin mi?")) removeBank(b.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="mt-3 text-base font-semibold">{b.name}</div>
                <div className="mt-1 text-xs font-mono text-muted-foreground truncate">{b.iban || "—"}</div>
                <div className="mt-4 text-xs text-muted-foreground">Güncel Bakiye</div>
                <div className="text-2xl font-bold tracking-tight">{fmt(bankBalance(b.id), b.currency)}</div>
                <Link to="/bankalar/$id" params={{ id: b.id }}>
                  <Button variant="outline" size="sm" className="mt-4 w-full">Hareketler</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
