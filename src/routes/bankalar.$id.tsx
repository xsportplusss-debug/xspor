import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, FileSpreadsheet, FileText, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { fmt } from "@/lib/mock-data";
import { useStore, bankBalance } from "@/lib/store";
import { ImportDialog } from "@/components/import-dialog";
import { rowsToBankTx, linesToBankTx } from "@/lib/importers";

export const Route = createFileRoute("/bankalar/$id")({
  head: () => ({ meta: [{ title: "Banka Hareketleri — Fintra" }] }),
  component: Page,
});

function Page() {
  const { id } = useParams({ from: "/bankalar/$id" });
  const bank = useStore((s) => s.banks.find((b) => b.id === id));
  const tx = useStore((s) => s.bankTx.filter((t) => t.bankId === id));
  const addBankTx = useStore((s) => s.addBankTx);
  const bulkAddBankTx = useStore((s) => s.bulkAddBankTx);
  const removeBankTx = useStore((s) => s.removeBankTx);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ date: string; description: string; category: string; type: "in" | "out"; amount: number }>({
    date: new Date().toISOString().slice(0, 10), description: "", category: "", type: "in", amount: 0,
  });

  const sorted = useMemo(() => [...tx].sort((a, b) => (a.date < b.date ? 1 : -1)), [tx]);

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
      bankId: id, date: form.date, description: form.description || "—",
      category: form.category || undefined,
      amount: form.type === "in" ? form.amount : -form.amount,
    });
    setOpen(false);
    setForm({ date: new Date().toISOString().slice(0, 10), description: "", category: "", type: "in", amount: 0 });
    toast.success("Hareket eklendi");
  };

  const balance = bankBalance(id);

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
              trigger={<Button variant="outline" size="sm"><FileSpreadsheet className="mr-1 h-4 w-4" /> Excel</Button>}
              onExcel={(rows) => { const l = rowsToBankTx(rows, id); bulkAddBankTx(l); return l.length; }}
              onPdf={(lines) => { const l = linesToBankTx(lines, id); bulkAddBankTx(l); return l.length; }}
            />
            <ImportDialog
              title="Banka ekstresi içe aktar"
              trigger={<Button variant="outline" size="sm"><FileText className="mr-1 h-4 w-4" /> PDF</Button>}
              onExcel={(rows) => { const l = rowsToBankTx(rows, id); bulkAddBankTx(l); return l.length; }}
              onPdf={(lines) => { const l = linesToBankTx(lines, id); bulkAddBankTx(l); return l.length; }}
            />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
                  <Plus className="mr-1 h-4 w-4" /> Yeni Hareket
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Yeni Hareket</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Tarih</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                    <div>
                      <Label>Tip</Label>
                      <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in">Giriş (Gelir)</SelectItem>
                          <SelectItem value="out">Çıkış (Gider)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Açıklama</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Kategori</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Kira, satış vb." /></div>
                    <div><Label>Tutar</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                  <Button onClick={save} className="gradient-primary text-primary-foreground">Kaydet</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <Card className="glass"><CardContent className="p-5">
        <div className="text-xs text-muted-foreground">Güncel Bakiye</div>
        <div className="text-3xl font-bold">{fmt(balance, bank.currency)}</div>
      </CardContent></Card>

      <Card className="glass"><CardContent className="p-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Giriş</TableHead>
                <TableHead className="text-right">Çıkış</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Henüz hareket yok
                </TableCell></TableRow>
              )}
              {sorted.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-muted-foreground">{t.date}</TableCell>
                  <TableCell>{t.description}</TableCell>
                  <TableCell className="text-muted-foreground">{t.category || "—"}</TableCell>
                  <TableCell className="text-right font-semibold text-success">
                    {t.amount > 0 ? <span className="inline-flex items-center gap-1"><ArrowDownLeft className="h-3.5 w-3.5" />{fmt(t.amount, bank.currency)}</span> : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-destructive">
                    {t.amount < 0 ? <span className="inline-flex items-center gap-1"><ArrowUpRight className="h-3.5 w-3.5" />{fmt(-t.amount, bank.currency)}</span> : "—"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { removeBankTx(t.id); toast.success("Silindi"); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent></Card>
    </div>
  );
}
