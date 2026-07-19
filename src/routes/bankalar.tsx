import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Landmark, Plus, Power, Trash2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { parseExcel, rowsToBankTx } from "@/lib/importers";
import { toast } from "sonner";
import { fmt } from "@/lib/mock-data";
import { useStore, bankBalance } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";


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

const dedupKey = (t: { date: string; description: string; amount: number; refNo?: string }) =>
  `${t.date}|${t.refNo || ""}|${t.description.trim().toLowerCase()}|${t.amount.toFixed(2)}`;

const SAMPLES: { file: string; name: string; short: string; color: string }[] = [
  { file: "/samples/halk-bankasi.xlsx", name: "Halk Bankası", short: "HALK", color: "#E30613" },
  { file: "/samples/vakif-bank.xlsx", name: "Vakıfbank", short: "VKF", color: "#F27A1A" },
];

function Page() {
  const banks = useStore((s) => s.banks);
  const bankTx = useStore((s) => s.bankTx);
  const addBank = useStore((s) => s.addBank);
  const removeBank = useStore((s) => s.removeBank);
  const updateBank = useStore((s) => s.updateBank);
  const bulkAddBankTx = useStore((s) => s.bulkAddBankTx);
  const addBankImport = useStore((s) => s.addBankImport);
  const [seeding, setSeeding] = useState(false);

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


  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", short: "", iban: "", currency: "TRY", balance: 0, color: COLORS[0] });

  const save = () => {
    if (!form.name) return toast.error("Banka adı girin");
    addBank(form);
    setOpen(false);
    setForm({ name: "", short: "", iban: "", currency: "TRY", balance: 0, color: COLORS[0] });
    toast.success("Banka eklendi");
  };

  const seedSamples = async () => {
    setSeeding(true);
    try {
      let totalNew = 0;
      for (const s of SAMPLES) {
        let bank = banks.find((b) => b.name.toLowerCase() === s.name.toLowerCase());
        if (!bank) {
          addBank({ name: s.name, short: s.short, iban: "", currency: "TRY", balance: 0, color: s.color });
          bank = useStore.getState().banks.find((b) => b.name.toLowerCase() === s.name.toLowerCase());
        }
        if (!bank) continue;
        const res = await fetch(s.file);
        if (!res.ok) { toast.error(`${s.name} dosyası bulunamadı`); continue; }
        const blob = await res.blob();
        const file = new File([blob], s.file.split("/").pop()!, { type: blob.type });
        const rows = await parseExcel(file);
        const txs = rowsToBankTx(rows, bank.id);
        const existingKeys = new Set(
          useStore.getState().bankTx.filter((t) => t.bankId === bank!.id).map(dedupKey),
        );
        const fresh = txs.filter((x) => !existingKeys.has(dedupKey(x)));
        const importId = addBankImport({
          bankId: bank.id, fileName: file.name, fileType: "excel",
          total: txs.length, success: fresh.length, failed: txs.length - fresh.length,
        });
        bulkAddBankTx(fresh.map((x) => ({ ...x, importId })));
        totalNew += fresh.length;
      }
      toast.success(`${totalNew} hareket yüklendi`, { description: "Halk Bankası + Vakıfbank" });
    } catch (e: any) {
      toast.error("Yükleme başarısız", { description: e.message });
    } finally {
      setSeeding(false);
    }
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
          {banks.map((b) => {
            const active = b.active !== false;
            const mm = metrics[b.id];
            return (
            <Card key={b.id} className={`glass overflow-hidden ${active ? "" : "opacity-60"}`}>
              <div className="h-1.5" style={{ backgroundColor: b.color }} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ backgroundColor: b.color }}>
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    {!active && <Badge variant="outline" className="text-[10px]">Pasif</Badge>}
                    <Button variant="ghost" size="icon" title={active ? "Pasif Yap" : "Aktif Yap"}
                      onClick={() => updateBank(b.id, { active: !active })}>
                      <Power className={`h-4 w-4 ${active ? "text-success" : "text-muted-foreground"}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Hesap ve hareketleri silinsin mi?")) removeBank(b.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 text-base font-semibold">{b.name}</div>
                <div className="mt-1 text-xs font-mono text-muted-foreground truncate">{b.iban || "—"}</div>
                <div className="mt-4 text-xs text-muted-foreground">Güncel Bakiye</div>
                <div className="text-2xl font-bold tracking-tight">{fmt(bankBalance(b.id), b.currency)}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-md bg-success/10 p-2">
                    <div className="text-muted-foreground">Toplam Gelen</div>
                    <div className="font-semibold text-success">{fmt(mm.in, b.currency)}</div>
                  </div>
                  <div className="rounded-md bg-destructive/10 p-2">
                    <div className="text-muted-foreground">Toplam Giden</div>
                    <div className="font-semibold text-destructive">{fmt(mm.out, b.currency)}</div>
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                  <span>Son: {mm.last || "—"}</span>
                  <span>{mm.count} hareket</span>
                </div>
                <Link to="/bankalar/$id" params={{ id: b.id }}>
                  <Button variant="outline" size="sm" className="mt-4 w-full">Hareketler</Button>
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
