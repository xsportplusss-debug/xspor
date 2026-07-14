import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, FileText, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fmtTL } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { ImportDialog } from "@/components/import-dialog";
import { rowsToInvoices, linesToInvoices } from "@/lib/importers";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/alis-faturalari")({
  head: () => ({
    meta: [
      { title: "Alış Faturaları — Fintra" },
      { name: "description", content: "Alış faturaları — ekle, sil, Excel/PDF içe aktar." },
    ],
  }),
  component: Page,
});

function Page() {
  const list = useStore((s) => s.purchaseInvoices);
  const addPurchase = useStore((s) => s.addPurchase);
  const bulkAddPurchase = useStore((s) => s.bulkAddPurchase);
  const removePurchase = useStore((s) => s.removePurchase);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    no: "", date: new Date().toISOString().slice(0, 10), party: "", total: 0,
  });

  const filtered = list.filter(
    (s) => s.no.toLowerCase().includes(q.toLowerCase()) || s.party.toLowerCase().includes(q.toLowerCase()),
  );

  const save = () => {
    if (!form.party) return toast.error("Tedarikçi giriniz");
    addPurchase({
      no: form.no || `AF-${Date.now().toString().slice(-6)}`,
      date: form.date, party: form.party, total: form.total,
      status: "Onaylı", payment: "Bekliyor",
    });
    setOpen(false);
    setForm({ no: "", date: new Date().toISOString().slice(0, 10), party: "", total: 0 });
    toast.success("Kaydedildi");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alış Faturaları"
        subtitle={`${list.length} kayıt`}
        actions={
          <>
            <ImportDialog
              title="Excel / PDF'den alış faturası içe aktar"
              trigger={<Button variant="outline" size="sm"><FileSpreadsheet className="mr-1 h-4 w-4" /> Excel</Button>}
              onExcel={(rows) => { const l = rowsToInvoices(rows); bulkAddPurchase(l); return l.length; }}
              onPdf={(lines) => { const l = linesToInvoices(lines); bulkAddPurchase(l); return l.length; }}
            />
            <ImportDialog
              title="Excel / PDF'den alış faturası içe aktar"
              trigger={<Button variant="outline" size="sm"><FileText className="mr-1 h-4 w-4" /> PDF</Button>}
              onExcel={(rows) => { const l = rowsToInvoices(rows); bulkAddPurchase(l); return l.length; }}
              onPdf={(lines) => { const l = linesToInvoices(lines); bulkAddPurchase(l); return l.length; }}
            />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
                  <Plus className="mr-1 h-4 w-4" /> Yeni Alış Faturası
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Yeni Alış Faturası</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Fatura No</Label><Input value={form.no} onChange={(e) => setForm({ ...form, no: e.target.value })} /></div>
                  <div><Label>Tarih</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                  <div><Label>Tedarikçi</Label><Input value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })} /></div>
                  <div><Label>Toplam</Label><Input type="number" value={form.total} onChange={(e) => setForm({ ...form, total: +e.target.value })} /></div>
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

      {list.length === 0 ? (
        <EmptyState title="Henüz alış faturası yok" desc="Yeni fatura oluşturun veya Excel/PDF'den içe aktarın." />
      ) : (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="mb-4 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Fatura no veya tedarikçi ara..." className="pl-9 max-w-md" />
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fatura No</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Tedarikçi</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Ödeme</TableHead>
                    <TableHead className="text-right">Toplam</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.no}</TableCell>
                      <TableCell className="text-muted-foreground">{s.date}</TableCell>
                      <TableCell>{s.party}</TableCell>
                      <TableCell><Badge variant={s.status === "Onaylı" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                      <TableCell><Badge variant={s.payment === "Tahsil Edildi" ? "default" : s.payment === "Kısmi" ? "secondary" : "outline"}>{s.payment}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{fmtTL(s.total)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => { removePurchase(s.id); toast.success("Silindi"); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
