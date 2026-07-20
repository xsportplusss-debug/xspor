import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Landmark, Plus, Power, Trash2, Pencil, Eraser, ListOrdered } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { fmt, type Bank } from "@/lib/mock-data";
import { useStore, bankBalance } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/bankalar/hesaplar")({
  head: () => ({
    meta: [
      { title: "Banka Ekle — Fintra" },
      { name: "description", content: "Banka hesabı tanımlama ve yönetimi." },
    ],
  }),
  component: Page,
});

const COLORS = ["#00A651", "#0055A4", "#004990", "#E30613", "#7B2CBF", "#F27A1A"];
const CURRENCIES = ["TRY", "USD", "EUR", "GBP", "CHF"];
const ACCOUNT_TYPES = ["Vadesiz", "Vadeli", "Kredi", "POS", "Döviz"];


type FormState = Omit<Bank, "id">;

const emptyForm: FormState = {
  name: "", short: "", iban: "", currency: "TRY", balance: 0, color: COLORS[0], active: true,
  accountName: "", accountType: "Vadesiz",
  branchName: "", branchCode: "", accountNumber: "",
  openingDate: new Date().toISOString().slice(0, 10), description: "",
};

function Page() {
  const banks = useStore((s) => s.banks);
  const bankTx = useStore((s) => s.bankTx);
  const addBank = useStore((s) => s.addBank);
  const removeBank = useStore((s) => s.removeBank);
  const updateBank = useStore((s) => s.updateBank);
  const bulkAddBankTx = useStore((s) => s.bulkAddBankTx);
  const addBankImport = useStore((s) => s.addBankImport);
  const bulkRemoveBankTx = useStore((s) => s.bulkRemoveBankTx);

  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthStr = todayStr.slice(0, 7);
    const m: Record<string, { in: number; out: number; todayIn: number; todayOut: number; monthIn: number; monthOut: number; last: string; count: number }> = {};
    for (const b of banks) m[b.id] = { in: 0, out: 0, todayIn: 0, todayOut: 0, monthIn: 0, monthOut: 0, last: "", count: 0 };
    for (const t of bankTx) {
      const x = m[t.bankId]; if (!x) continue;
      x.count++;
      const isIn = t.amount >= 0;
      const abs = Math.abs(t.amount);
      if (isIn) x.in += abs; else x.out += abs;
      if (t.date === todayStr) { if (isIn) x.todayIn += abs; else x.todayOut += abs; }
      if (t.date.startsWith(monthStr)) { if (isIn) x.monthIn += abs; else x.monthOut += abs; }
      if (!x.last || t.date > x.last) x.last = t.date;
    }
    return m;
  }, [banks, bankTx]);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const openNew = () => { setEditId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (b: Bank) => {
    setEditId(b.id);
    setForm({ ...emptyForm, ...b });
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) return toast.error("Banka adı girin");
    if (editId) {
      updateBank(editId, form);
      toast.success("Banka güncellendi");
    } else {
      addBank(form);
      toast.success("Banka eklendi");
    }
    setOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const tryRemove = (b: Bank) => {
    const hasTx = bankTx.some((t) => t.bankId === b.id);
    if (hasTx) return toast.error("Bu bankada hareket var — önce hareketleri silmelisiniz");
    if (confirm(`${b.name} silinsin mi?`)) removeBank(b.id);
  };

  const clearBankTx = (b: Bank) => {
    const ids = bankTx.filter((t) => t.bankId === b.id).map((t) => t.id);
    if (ids.length === 0) return toast.info("Bu bankada hareket yok");
    if (!confirm(`${b.name} — ${ids.length} hareketin tamamı silinsin mi?`)) return;
    bulkRemoveBankTx(ids);
    toast.success(`${ids.length} hareket silindi`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bankalar"
        subtitle={`${banks.length} hesap`}
        actions={
          <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Yeni Banka Ekle
          </Button>
        
        }
      />

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Bankayı Düzenle" : "Yeni Banka Ekle"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2"><Label>Banka Adı *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Kısaltma</Label><Input value={form.short} onChange={(e) => setForm({ ...form, short: e.target.value.toUpperCase() })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Hesap Adı</Label><Input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} /></div>
              <div><Label>Hesap Numarası</Label><Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Şube Adı</Label><Input value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} /></div>
              <div><Label>Şube Kodu</Label><Input value={form.branchCode} onChange={(e) => setForm({ ...form, branchCode: e.target.value })} /></div>
            </div>
            <div><Label>IBAN</Label><Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase() })} /></div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label>Para Birimi</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Hesap Türü</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={form.accountType || "Vadesiz"}
                  onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                >
                  {ACCOUNT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><Label>Başlangıç Bakiyesi</Label><Input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: +e.target.value })} /></div>
              <div><Label>Açılış Tarihi</Label><Input type="date" value={form.openingDate} onChange={(e) => setForm({ ...form, openingDate: e.target.value })} /></div>
            </div>
            <div><Label>Açıklama</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
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
            <div className="flex items-center gap-3 rounded-md border p-3">
              <Switch checked={form.active !== false} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <div className="text-sm">
                <div className="font-medium">{form.active !== false ? "Aktif" : "Pasif"}</div>
                <div className="text-xs text-muted-foreground">Pasif hesaplar listede soluk görünür.</div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={save} className="gradient-primary text-primary-foreground">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                      <Button variant="ghost" size="icon" title="Düzenle" onClick={() => openEdit(b)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title={active ? "Pasif Yap" : "Aktif Yap"}
                        onClick={() => updateBank(b.id, { active: !active })}>
                        <Power className={`h-4 w-4 ${active ? "text-success" : "text-muted-foreground"}`} />
                      </Button>
                      <Button variant="ghost" size="icon" title="Hareketleri Sil" onClick={() => clearBankTx(b)}>
                        <Eraser className="h-4 w-4 text-warning" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Bankayı Sil" onClick={() => tryRemove(b)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 text-base font-semibold">{b.name}</div>
                  {b.accountName && <div className="text-xs text-muted-foreground">{b.accountName}</div>}
                  <div className="mt-1 text-xs font-mono text-muted-foreground truncate">{b.iban || "—"}</div>
                  {(b.branchName || b.branchCode) && (
                    <div className="text-[11px] text-muted-foreground">
                      {b.branchName || "Şube"}{b.branchCode ? ` · ${b.branchCode}` : ""}
                    </div>
                  )}
                  <div className="mt-4 text-xs text-muted-foreground">Güncel Bakiye</div>
                  <div className="text-2xl font-bold tracking-tight">{fmt(bankBalance(b.id), b.currency)}</div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-md bg-success/10 p-2">
                      <div className="text-muted-foreground">Bugün Gelen</div>
                      <div className="font-semibold text-success">{fmt(mm.todayIn, b.currency)}</div>
                    </div>
                    <div className="rounded-md bg-destructive/10 p-2">
                      <div className="text-muted-foreground">Bugün Giden</div>
                      <div className="font-semibold text-destructive">{fmt(mm.todayOut, b.currency)}</div>
                    </div>
                    <div className="rounded-md bg-success/10 p-2">
                      <div className="text-muted-foreground">Bu Ay Gelen</div>
                      <div className="font-semibold text-success">{fmt(mm.monthIn, b.currency)}</div>
                    </div>
                    <div className="rounded-md bg-destructive/10 p-2">
                      <div className="text-muted-foreground">Bu Ay Giden</div>
                      <div className="font-semibold text-destructive">{fmt(mm.monthOut, b.currency)}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                    <span>Son: {mm.last || "—"}</span>
                    <span>{mm.count} hareket</span>
                  </div>
                  <Link to="/bankalar/$id" params={{ id: b.id }}>
                    <Button size="sm" className="mt-4 w-full gradient-primary text-primary-foreground">
                      <ListOrdered className="mr-1 h-4 w-4" /> Hareketleri Gör ({mm.count})
                    </Button>
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
