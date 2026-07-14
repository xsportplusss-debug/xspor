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
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { fmt } from "@/lib/mock-data";
import { useStore, cashBalance } from "@/lib/store";

export const Route = createFileRoute("/kasa/$id")({
  head: () => ({ meta: [{ title: "Kasa Hareketleri — Fintra" }] }),
  component: Page,
});

function Page() {
  const { id } = useParams({ from: "/kasa/$id" });
  const cash = useStore((s) => s.cashRegisters.find((c) => c.id === id));
  const tx = useStore((s) => s.cashTx.filter((t) => t.cashId === id));
  const addCashTx = useStore((s) => s.addCashTx);
  const updateCashTx = useStore((s) => s.updateCashTx);
  const removeCashTx = useStore((s) => s.removeCashTx);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<{ date: string; description: string; category: string; type: "in" | "out" | "adj"; amount: number }>({
    date: new Date().toISOString().slice(0, 10), description: "", category: "", type: "in", amount: 0,
  });

  const sorted = useMemo(() => [...tx].sort((a, b) => (a.date < b.date ? 1 : -1)), [tx]);

  if (!cash) {
    return (
      <div className="space-y-6">
        <PageHeader title="Bulunamadı" />
        <Link to="/kasa"><Button variant="outline"><ArrowLeft className="mr-1 h-4 w-4" /> Kasa</Button></Link>
      </div>
    );
  }

  const openNew = () => {
    setEditing(null);
    setForm({ date: new Date().toISOString().slice(0, 10), description: "", category: "", type: "in", amount: 0 });
    setOpen(true);
  };
  const openEdit = (t: (typeof tx)[number]) => {
    setEditing(t.id);
    setForm({
      date: t.date, description: t.description, category: t.category || "",
      type: t.amount >= 0 ? "in" : "out",
      amount: Math.abs(t.amount),
    });
    setOpen(true);
  };
  const save = () => {
    if (!form.amount) return toast.error("Tutar girin");
    const signed = form.type === "in" ? form.amount : form.type === "out" ? -form.amount : form.amount;
    if (editing) {
      updateCashTx(editing, {
        date: form.date, description: form.description || "—",
        category: form.category || undefined,
        amount: form.type === "adj" ? signed : (form.type === "in" ? form.amount : -form.amount),
      });
      toast.success("Güncellendi");
    } else {
      addCashTx({
        cashId: id, date: form.date, description: form.description || "—",
        category: form.category || undefined,
        amount: form.type === "in" ? form.amount : -form.amount,
      });
      toast.success("Eklendi");
    }
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={cash.name}
        subtitle={`Para birimi: ${cash.currency}`}
        actions={
          <>
            <Link to="/kasa"><Button variant="outline" size="sm"><ArrowLeft className="mr-1 h-4 w-4" /> Geri</Button></Link>
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={openNew}>
              <Plus className="mr-1 h-4 w-4" /> Yeni Hareket
            </Button>
          </>
        }
      />

      <Card className="glass"><CardContent className="p-5">
        <div className="text-xs text-muted-foreground">Güncel Bakiye</div>
        <div className="text-3xl font-bold">{fmt(cashBalance(id), cash.currency)}</div>
      </CardContent></Card>

      <Card className="glass"><CardContent className="p-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Henüz hareket yok</TableCell></TableRow>
              )}
              {sorted.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-muted-foreground">{t.date}</TableCell>
                  <TableCell>{t.description}</TableCell>
                  <TableCell className="text-muted-foreground">{t.category || "—"}</TableCell>
                  <TableCell className={`text-right font-semibold ${t.amount >= 0 ? "text-success" : "text-destructive"}`}>
                    {t.amount >= 0 ? "+" : ""}{fmt(t.amount, cash.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { removeCashTx(t.id); toast.success("Silindi"); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Hareketi Düzenle" : "Yeni Kasa Hareketi"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Tarih</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div>
                <Label>Tip</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Giriş</SelectItem>
                    <SelectItem value="out">Çıkış</SelectItem>
                    <SelectItem value="adj">Düzeltme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Açıklama</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Kategori</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div><Label>Tutar</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={save} className="gradient-primary text-primary-foreground">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
