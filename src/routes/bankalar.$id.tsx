import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { fmt, type BankTx } from "@/lib/mock-data";
import { useStore, bankBalance } from "@/lib/store";
import { ImportDialog } from "@/components/import-dialog";
import { rowsToBankTx, linesToBankTx } from "@/lib/importers";
import { useSelection } from "@/hooks/use-selection";

export const Route = createFileRoute("/bankalar/$id")({
  head: () => ({ meta: [{ title: "Banka Hareketleri — Fintra" }] }),
  component: Page,
});

type Form = { bankId: string; date: string; description: string; category: string; type: "in" | "out"; amount: number };

function Page() {
  const { id } = useParams({ from: "/bankalar/$id" });
  const banks = useStore((s) => s.banks);
  const bank = banks.find((b) => b.id === id);
  const tx = useStore((s) => s.bankTx.filter((t) => t.bankId === id));
  const addBankTx = useStore((s) => s.addBankTx);
  const bulkAddBankTx = useStore((s) => s.bulkAddBankTx);
  const updateBankTx = useStore((s) => s.updateBankTx);
  const removeBankTx = useStore((s) => s.removeBankTx);
  const bulkRemoveBankTx = useStore((s) => s.bulkRemoveBankTx);

  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<BankTx | null>(null);
  const emptyForm = (): Form => ({
    bankId: id, date: new Date().toISOString().slice(0, 10),
    description: "", category: "", type: "in", amount: 0,
  });
  const [form, setForm] = useState<Form>(emptyForm());

  const sorted = useMemo(() => [...tx].sort((a, b) => (a.date < b.date ? 1 : -1)), [tx]);
  const sel = useSelection(sorted);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title={bank.name}
        subtitle={bank.iban || "IBAN yok"}
        actions={
          <>
            <Link to="/bankalar"><Button variant="outline" size="sm"><ArrowLeft className="mr-1 h-4 w-4" /> Geri</Button></Link>
            <ImportDialog
              title="Banka ekstresi içe aktar"
              trigger={<Button variant="outline" size="sm"><FileSpreadsheet className="mr-1 h-4 w-4" /> Excel/PDF</Button>}
              onExcel={(rows) => { const l = rowsToBankTx(rows, id); bulkAddBankTx(l); return l.length; }}
              onPdf={(lines) => { const l = linesToBankTx(lines, id); bulkAddBankTx(l); return l.length; }}
            />
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

      <Card className="glass"><CardContent className="p-5">
        <div className="text-xs text-muted-foreground">Güncel Bakiye</div>
        <div className="text-3xl font-bold">{fmt(bankBalance(id), bank.currency)}</div>
      </CardContent></Card>

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
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={sel.allChecked ? true : sel.someChecked ? "indeterminate" : false}
                    onCheckedChange={sel.toggleAll}
                  />
                </TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Gelen</TableHead>
                <TableHead className="text-right">Giden</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Henüz hareket yok
                </TableCell></TableRow>
              )}
              {sorted.map((t) => (
                <TableRow key={t.id} data-state={sel.selected.has(t.id) ? "selected" : undefined}>
                  <TableCell><Checkbox checked={sel.selected.has(t.id)} onCheckedChange={() => sel.toggle(t.id)} /></TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{t.date}</TableCell>
                  <TableCell className="max-w-[420px] truncate">{t.description}</TableCell>
                  <TableCell className="text-muted-foreground">{t.category || "—"}</TableCell>
                  <TableCell className="text-right font-semibold text-success">
                    {t.amount > 0 ? <span className="inline-flex items-center gap-1"><ArrowDownLeft className="h-3.5 w-3.5" />{fmt(t.amount, bank.currency)}</span> : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-destructive">
                    {t.amount < 0 ? <span className="inline-flex items-center gap-1"><ArrowUpRight className="h-3.5 w-3.5" />{fmt(-t.amount, bank.currency)}</span> : "—"}
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
          <Select value={value.type} onValueChange={(v) => set({ type: v as any })}>
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
