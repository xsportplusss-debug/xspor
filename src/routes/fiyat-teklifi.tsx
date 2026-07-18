import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ImageOff, Plus, Printer, Search, Trash2 } from "lucide-react";
import { fmtTL, type Product } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { useCompany } from "@/lib/company";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";

export const Route = createFileRoute("/fiyat-teklifi")({
  head: () => ({
    meta: [
      { title: "Fiyat Teklifi — Fintra" },
      { name: "description", content: "Proforma tarzı fiyat teklifi hazırlayın ve yazdırın." },
    ],
  }),
  component: Page,
});

type Line = {
  id: string;
  productId: string;
  image?: string;
  name: string;
  brand: string;
  sku: string;
  price1: number;      // KDV hariç toptan
  tax: number;         // KDV %
  qty: number;
};

const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);

function Page() {
  const company = useCompany();
  const products = useStore((s) => s.products);

  const [quoteNo, setQuoteNo] = useState(`TKL-${Date.now().toString().slice(-6)}`);
  const [date, setDate] = useState(todayISO());
  const [validUntil, setValidUntil] = useState("");
  const [customer, setCustomer] = useState({ name: "", taxNo: "", address: "", phone: "", email: "" });
  const [markup, setMarkup] = useState(0);    // %
  const [globalDiscount, setGlobalDiscount] = useState(0); // %
  const [notes, setNotes] = useState("Fiyatlarımız 15 gün geçerlidir. Ödeme peşindir.");
  const [lines, setLines] = useState<Line[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  function addProduct(p: Product) {
    setLines((ls) => [
      ...ls,
      {
        id: uid(),
        productId: p.id,
        image: p.image,
        name: p.name,
        brand: p.brand,
        sku: p.sku,
        price1: p.price1,
        tax: p.tax || 20,
        qty: 1,
      },
    ]);
  }

  const rows = useMemo(() => {
    return lines.map((l) => {
      const unit = l.price1 * (1 + markup / 100);
      const gross = unit * l.qty;
      const disc = gross * (globalDiscount / 100);
      const net = gross - disc;
      const vat = net * (l.tax / 100);
      const total = net + vat;
      return { ...l, unit, gross, disc, net, vat, total };
    });
  }, [lines, markup, globalDiscount]);

  const sums = rows.reduce(
    (a, r) => ({ net: a.net + r.net, vat: a.vat + r.vat, total: a.total + r.total, disc: a.disc + r.disc, gross: a.gross + r.gross }),
    { net: 0, vat: 0, total: 0, disc: 0, gross: 0 },
  );

  function updateLine(id: string, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function removeLine(id: string) {
    setLines((ls) => ls.filter((l) => l.id !== id));
  }

  return (
    <div className="space-y-6 print:space-y-3">
      <div className="print:hidden">
        <PageHeader
          title="Fiyat Teklifi"
          subtitle="Ürünleri ekleyin, % ile fiyat ayarlayın, yazdırın."
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="mr-1 h-4 w-4" /> Yazdır / PDF
              </Button>
              <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
                    <Plus className="mr-1 h-4 w-4" /> Ürün Ekle
                  </Button>
                </DialogTrigger>
                <ProductPicker
                  products={products}
                  onPick={(p) => { addProduct(p); toast.success(`${p.name} eklendi`); }}
                  onClose={() => setPickerOpen(false)}
                />
              </Dialog>
            </>
          }
        />
      </div>

      {/* Yazdırılabilir Teklif */}
      <Card className="glass print:shadow-none print:border-0">
        <CardContent className="p-6 md:p-8 print:p-0">
          {/* Üst blok */}
          <div className="flex flex-col gap-6 border-b pb-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              {company.logoUrl && (
                <img src={company.logoUrl} alt={company.name} className="h-20 w-20 rounded-lg object-contain bg-white p-1 border" />
              )}
              <div>
                <div className="text-xl font-bold tracking-tight">{company.name || "Firma Adı"}</div>
                {company.taxOffice && <div className="text-xs text-muted-foreground">V.D.: {company.taxOffice} — VKN: {company.taxNo}</div>}
                {company.address && <div className="mt-1 max-w-xs text-xs text-muted-foreground">{company.address}</div>}
                <div className="mt-1 text-xs text-muted-foreground">
                  {company.phone && <span>{company.phone}</span>}
                  {company.email && <span> · {company.email}</span>}
                  {company.web && <span> · {company.web}</span>}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-primary">FİYAT TEKLİFİ</div>
              <div className="mt-2 grid gap-1 text-sm">
                <div><span className="text-muted-foreground">Teklif No: </span>
                  <input value={quoteNo} onChange={(e) => setQuoteNo(e.target.value)} className="w-40 bg-transparent text-right font-medium outline-none print:border-none" />
                </div>
                <div><span className="text-muted-foreground">Tarih: </span>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent text-right font-medium outline-none" />
                </div>
                <div><span className="text-muted-foreground">Geçerlilik: </span>
                  <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="bg-transparent text-right outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Cari (Müşteri) */}
          <div className="mt-6 rounded-lg border bg-muted/20 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sayın</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label className="text-xs">Ünvan</Label>
                <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="border-0 border-b rounded-none bg-transparent px-0" />
              </div>
              <div><Label className="text-xs">Vergi No / TCKN</Label>
                <Input value={customer.taxNo} onChange={(e) => setCustomer({ ...customer, taxNo: e.target.value })} className="border-0 border-b rounded-none bg-transparent px-0" />
              </div>
              <div className="md:col-span-2"><Label className="text-xs">Adres</Label>
                <Input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} className="border-0 border-b rounded-none bg-transparent px-0" />
              </div>
              <div><Label className="text-xs">Telefon</Label>
                <Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className="border-0 border-b rounded-none bg-transparent px-0" />
              </div>
              <div><Label className="text-xs">E-posta</Label>
                <Input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} className="border-0 border-b rounded-none bg-transparent px-0" />
              </div>
            </div>
          </div>

          {/* Fiyat ayar barı */}
          <div className="mt-6 flex flex-wrap items-end gap-3 print:hidden">
            <div>
              <Label className="text-xs">Tüm satırlara % artış</Label>
              <div className="flex items-center gap-2">
                <Input type="number" value={markup} onChange={(e) => setMarkup(+e.target.value)} className="w-28" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <Label className="text-xs">Genel İskonto</Label>
              <div className="flex items-center gap-2">
                <Input type="number" value={globalDiscount} onChange={(e) => setGlobalDiscount(+e.target.value)} className="w-28" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Fiyatlar toptan fiyatın (price1) üzerine uygulanır.</div>
          </div>

          {/* Ürün tablosu */}
          <div className="mt-4 overflow-x-auto">
            {rows.length === 0 ? (
              <EmptyState title="Henüz ürün eklenmedi" desc='Sağ üstteki "Ürün Ekle" ile başlayın.' />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Görsel</TableHead>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Stok Kodu</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead className="text-right">Birim Fiyat</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead className="text-right">KDV %</TableHead>
                    <TableHead className="text-right">Toplam (KDV Dahil)</TableHead>
                    <TableHead className="w-10 print:hidden"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        {r.image ? (
                          <img src={r.image} alt={r.name} className="h-12 w-12 rounded-md border object-cover" />
                        ) : (
                          <div className="grid h-12 w-12 place-items-center rounded-md border bg-muted text-muted-foreground"><ImageOff className="h-4 w-4" /></div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{r.name}</div>
                        {r.brand && <div className="text-xs text-muted-foreground">{r.brand}</div>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                      <TableCell className="text-right">
                        <Input type="number" min={1} value={r.qty}
                          onChange={(e) => updateLine(r.id, { qty: Math.max(1, +e.target.value) })}
                          className="ml-auto w-20 text-right print:border-none print:p-0" />
                      </TableCell>
                      <TableCell className="text-right">{fmtTL(r.unit)}</TableCell>
                      <TableCell className="text-right">{fmtTL(r.net)}</TableCell>
                      <TableCell className="text-right">%{r.tax}</TableCell>
                      <TableCell className="text-right font-semibold">{fmtTL(r.total)}</TableCell>
                      <TableCell className="print:hidden">
                        <Button variant="ghost" size="icon" onClick={() => removeLine(r.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/40">
                    <TableCell colSpan={5} className="text-right font-medium">Ara Toplam (KDV Hariç)</TableCell>
                    <TableCell className="text-right">{fmtTL(sums.net)}</TableCell>
                    <TableCell colSpan={3} className="print:hidden"></TableCell>
                    <TableCell colSpan={0} className="hidden print:table-cell"></TableCell>
                  </TableRow>
                  {globalDiscount > 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-right text-muted-foreground">İskonto (%{globalDiscount})</TableCell>
                      <TableCell className="text-right text-muted-foreground">-{fmtTL(sums.disc)}</TableCell>
                      <TableCell colSpan={3} className="print:hidden"></TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell colSpan={5} className="text-right font-medium">KDV Toplamı</TableCell>
                    <TableCell className="text-right">{fmtTL(sums.vat)}</TableCell>
                    <TableCell colSpan={3} className="print:hidden"></TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/10">
                    <TableCell colSpan={5} className="text-right text-base font-bold">GENEL TOPLAM</TableCell>
                    <TableCell className="text-right text-base font-bold text-primary">{fmtTL(sums.total)}</TableCell>
                    <TableCell colSpan={3} className="print:hidden"></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </div>

          {/* Notlar / imza */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <Label className="text-xs">Notlar / Şartlar</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-1" />
            </div>
            <div className="rounded-lg border p-4 text-sm">
              <div className="mb-2 font-semibold">Ödeme Bilgileri</div>
              <div className="text-xs text-muted-foreground">
                Firma ünvanı, IBAN ve banka bilgileri Firma Ayarları sayfasından güncellenebilir.
              </div>
              <div className="mt-6 flex justify-between border-t pt-4 text-xs text-muted-foreground">
                <span>Teklifi Hazırlayan</span>
                <span>Kaşe / İmza</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductPicker({
  products, onPick, onClose,
}: { products: Product[]; onPick: (p: Product) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const filtered = products.filter((p) =>
    [p.name, p.sku, p.barcode, p.brand, p.category].filter(Boolean).some((v) => v.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader><DialogTitle>Ürün Seç</DialogTitle></DialogHeader>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, marka, stok kodu, barkod..." className="pl-9" />
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {products.length === 0 ? (
          <EmptyState title="Ürün yok" desc="Önce ürün ekleyin veya Excel'den içe aktarın." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead>Stok Kodu</TableHead>
                <TableHead className="text-right">Fiyat</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 200).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.image ? (
                      <img src={p.image} className="h-10 w-10 rounded border object-cover" alt="" />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded border bg-muted text-muted-foreground"><ImageOff className="h-4 w-4" /></div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.brand}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="text-right">{fmtTL(p.price1)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => onPick(p)}>Ekle</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Kapat</Button></DialogFooter>
    </DialogContent>
  );
}
