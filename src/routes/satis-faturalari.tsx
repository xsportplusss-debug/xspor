import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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

export const Route = createFileRoute("/satis-faturalari")({
  head: () => ({
    meta: [
      { title: "Satış Faturaları — Fintra" },
      { name: "description", content: "Satış faturaları — ekle, sil, Excel/PDF içe aktar." },
    ],
  }),
  component: Page,
});

type Line = { productId: string; qty: number; price: number; discount: number; vat: number };

function Page() {
  const salesInvoices = useStore((s) => s.salesInvoices);
  const cariList = useStore((s) => s.cariList);
  const products = useStore((s) => s.products);
  const addSales = useStore((s) => s.addSales);
  const bulkAddSales = useStore((s) => s.bulkAddSales);
  const removeSales = useStore((s) => s.removeSales);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [party, setParty] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([{ productId: "", qty: 1, price: 0, discount: 0, vat: 20 }]);

  const filtered = salesInvoices.filter(
    (s) => s.no.toLowerCase().includes(q.toLowerCase()) || s.party.toLowerCase().includes(q.toLowerCase()),
  );

  const total = lines.reduce((acc, l) => {
    const sub = l.qty * l.price * (1 - l.discount / 100);
    return acc + sub * (1 + l.vat / 100);
  }, 0);

  const save = () => {
    if (!party) return toast.error("Cari seçin");
    addSales({
      no: `SF-${Date.now().toString().slice(-6)}`,
      date, party, total,
      status: "Onaylı", payment: "Bekliyor",
    });
    setOpen(false);
    setLines([{ productId: "", qty: 1, price: 0, discount: 0, vat: 20 }]);
    setParty("");
    toast.success("Fatura kaydedildi", { description: fmtTL(total) });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Satış Faturaları"
        subtitle={`${salesInvoices.length} kayıt`}
        actions={
          <>
            <ImportDialog
              title="Excel / PDF'den satış faturası içe aktar"
              trigger={<Button variant="outline" size="sm"><FileSpreadsheet className="mr-1 h-4 w-4" /> Excel</Button>}
              onExcel={(rows) => { const list = rowsToInvoices(rows); bulkAddSales(list); return list.length; }}
              onPdf={(lines) => { const list = linesToInvoices(lines); bulkAddSales(list); return list.length; }}
            />
            <ImportDialog
              title="Excel / PDF'den satış faturası içe aktar"
              trigger={<Button variant="outline" size="sm"><FileText className="mr-1 h-4 w-4" /> PDF</Button>}
              onExcel={(rows) => { const list = rowsToInvoices(rows); bulkAddSales(list); return list.length; }}
              onPdf={(lines) => { const list = linesToInvoices(lines); bulkAddSales(list); return list.length; }}
            />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
                  <Plus className="mr-1 h-4 w-4" /> Yeni Satış Faturası
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader><DialogTitle>Yeni Satış Faturası</DialogTitle></DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label>Cari</Label>
                      {cariList.length ? (
                        <Select value={party} onValueChange={setParty}>
                          <SelectTrigger><SelectValue placeholder="Cari seçin" /></SelectTrigger>
                          <SelectContent>
                            {cariList.map((c) => <SelectItem key={c.id} value={c.title}>{c.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={party} onChange={(e) => setParty(e.target.value)} placeholder="Cari adı" />
                      )}
                    </div>
                    <div>
                      <Label>Tarih</Label>
                      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                  </div>

                  <div className="rounded-lg border">
                    <div className="grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto] gap-2 border-b bg-muted/40 p-2 text-xs font-medium">
                      <div>Ürün</div><div>Miktar</div><div>B. Fiyat</div><div>İsk. %</div><div>KDV %</div><div></div>
                    </div>
                    {lines.map((l, i) => (
                      <div key={i} className="grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto] items-center gap-2 border-b p-2 last:border-b-0">
                        {products.length ? (
                          <Select value={l.productId} onValueChange={(v) => {
                            const p = products.find((p) => p.id === v);
                            setLines((prev) => prev.map((x, j) => j === i ? { ...x, productId: v, price: p?.sell ?? x.price, vat: p?.vat ?? x.vat } : x));
                          }}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Ürün" /></SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input placeholder="Açıklama" />
                        )}
                        <Input type="number" value={l.qty} onChange={(e) => setLines((prev) => prev.map((x, j) => j === i ? { ...x, qty: +e.target.value } : x))} />
                        <Input type="number" value={l.price} onChange={(e) => setLines((prev) => prev.map((x, j) => j === i ? { ...x, price: +e.target.value } : x))} />
                        <Input type="number" value={l.discount} onChange={(e) => setLines((prev) => prev.map((x, j) => j === i ? { ...x, discount: +e.target.value } : x))} />
                        <Input type="number" value={l.vat} onChange={(e) => setLines((prev) => prev.map((x, j) => j === i ? { ...x, vat: +e.target.value } : x))} />
                        <Button variant="ghost" size="icon" onClick={() => setLines((p) => p.filter((_, j) => j !== i))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="p-2">
                      <Button variant="outline" size="sm" onClick={() => setLines((p) => [...p, { productId: "", qty: 1, price: 0, discount: 0, vat: 20 }])}>
                        <Plus className="mr-1 h-4 w-4" /> Satır Ekle
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-1 rounded-lg border bg-muted/30 p-3 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Ara Toplam</span><span>{fmtTL(total / 1.2)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">KDV</span><span>{fmtTL(total - total / 1.2)}</span></div>
                      <div className="mt-1 flex justify-between border-t pt-2 font-bold"><span>Genel Toplam</span><span>{fmtTL(total)}</span></div>
                    </div>
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

      {salesInvoices.length === 0 ? (
        <EmptyState title="Henüz satış faturası yok" desc="Yeni fatura oluşturun veya Excel/PDF'den içe aktarın." />
      ) : (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Fatura no veya müşteri ara..." className="pl-9" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fatura No</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tahsilat</TableHead>
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
                      <TableCell>
                        <Badge variant={s.status === "Onaylı" ? "default" : s.status === "Taslak" ? "secondary" : "destructive"}>{s.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.payment === "Tahsil Edildi" ? "default" : s.payment === "Kısmi" ? "secondary" : "outline"}>{s.payment}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{fmtTL(s.total)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => { removeSales(s.id); toast.success("Silindi"); }}>
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
