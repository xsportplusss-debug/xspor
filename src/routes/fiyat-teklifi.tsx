import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ImageOff, Percent, Plus, Printer, Search, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtTL, type Product, type Currency } from "@/lib/mock-data";
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
  price1: number;      // ürünün orijinal fiyatı (currency cinsinden, KDV hariç)
  currency: Currency;  // ürünün para birimi
  tax: number;         // KDV %
  qty: number;
  markup: number;      // % — arka planda, çıktıda görünmez
};

const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);

function Page() {
  const company = useCompany();
  const products = useStore((s) => s.products);

  // Manuel kur — teklifin döviz cinsi ve ona ait kur (TL karşılığı).
  const [docCurrency, setDocCurrency] = useState<Currency>("USD");
  const [manualRate, setManualRate] = useState<number>(40); // 1 birim = ? TL

  const [quoteNo, setQuoteNo] = useState(`TKL-${Date.now().toString().slice(-6)}`);
  const [date, setDate] = useState(todayISO());
  const [validUntil, setValidUntil] = useState("");
  const [customer, setCustomer] = useState({ name: "", taxNo: "", address: "", phone: "", email: "" });
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMarkup, setBulkMarkup] = useState(0);
  const [bulkDiscount, setBulkDiscount] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  function addProduct(p: Product) {
    setLines((ls) => [
      ...ls,
      {
        id: uid(), productId: p.id, image: p.image,
        name: p.name, brand: p.brand, sku: p.sku,
        price1: p.price1, currency: p.currency,
        tax: p.tax || 20, qty: 1, markup: 0,
      },
    ]);
  }

  const rows = useMemo(() => {
    return lines.map((l) => {
      // Formül: price1 (KDV hariç) × (markup) × (currency==TRY ? 1 : manualRate)
      const rate = l.currency === "TRY" ? 1 : manualRate;
      const unit = l.price1 * (1 + l.markup / 100) * rate;
      const gross = unit * l.qty;
      const disc = gross * (globalDiscount / 100);
      const net = gross - disc;
      const vat = net * (l.tax / 100);
      const total = net + vat;
      return { ...l, unit, gross, disc, net, vat, total };
    });
  }, [lines, globalDiscount, manualRate]);

  const sums = rows.reduce(
    (a, r) => ({ net: a.net + r.net, vat: a.vat + r.vat, total: a.total + r.total, disc: a.disc + r.disc }),
    { net: 0, vat: 0, total: 0, disc: 0 },
  );

  function updateLine(id: string, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function removeLine(id: string) {
    setLines((ls) => ls.filter((l) => l.id !== id));
    setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
  }
  function toggleSel(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected((s) => s.size === lines.length ? new Set() : new Set(lines.map((l) => l.id)));
  }
  function applyBulkMarkup() {
    if (!selected.size) return toast.error("Önce satır seçin");
    setLines((ls) => ls.map((l) => selected.has(l.id) ? { ...l, markup: bulkMarkup } : l));
    toast.success(`${selected.size} satıra %${bulkMarkup} artış uygulandı`);
  }
  function applyBulkDiscount() {
    setGlobalDiscount(bulkDiscount);
    toast.success(`Genel iskonto %${bulkDiscount} olarak ayarlandı`);
  }
  function deleteSelected() {
    if (!selected.size) return;
    setLines((ls) => ls.filter((l) => !selected.has(l.id)));
    setSelected(new Set());
  }

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(`https://${company.web || "xsportplus.com.tr"}`)}`;

  return (
    <div className="space-y-6 print:space-y-3">
      <div className="print:hidden">
        <PageHeader
          title="Fiyat Teklifi"
          subtitle="Ürünleri ekleyin, seçip toplu % artış uygulayın, yazdırın."
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

      <Card className="glass print:shadow-none print:border-0">
        <CardContent className="p-6 md:p-8 print:p-0">
          {/* Üst blok: sol firma metni + sağ logo & QR */}
          <div className="flex flex-col gap-6 border-b pb-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-md">
              <div className="text-2xl font-extrabold tracking-tight text-primary">
                {company.name} {company.tagline} - {company.owner}
              </div>
              <div className="mt-4 grid gap-1 text-xs text-muted-foreground">
                {company.phone && <div><span className="font-medium text-foreground">Tel:</span> {company.phone}</div>}
                {company.web && <div><span className="font-medium text-foreground">Web:</span> {company.web}</div>}
                {company.email && <div><span className="font-medium text-foreground">E-posta:</span> {company.email}</div>}
                {company.taxOffice && <div><span className="font-medium text-foreground">Vergi Dairesi:</span> {company.taxOffice}</div>}
                {company.taxNo && <div><span className="font-medium text-foreground">VKN:</span> {company.taxNo}</div>}
                {company.kep && <div><span className="font-medium text-foreground">KEP:</span> {company.kep}</div>}
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              {company.logoUrl && (
                <img src={company.logoUrl} alt={company.name} className="h-20 w-auto object-contain" />
              )}
              <img src={qrSrc} alt="QR" className="h-24 w-24 rounded border bg-white p-1" />
              <div className="w-full max-w-[220px] rounded-lg border bg-muted/30 p-3 text-xs">
                <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-widest text-primary">Fiyat Teklifi</div>
                <div className="grid gap-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Teklif No:</span>
                    <input value={quoteNo} onChange={(e) => setQuoteNo(e.target.value)} className="w-28 bg-transparent text-right font-medium outline-none" />
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Tarih:</span>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent text-right font-medium outline-none" />
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Geçerlilik:</span>
                    <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="bg-transparent text-right outline-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cari — kompakt */}
          <div className="mt-6 rounded-lg border bg-muted/20 p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sayın</div>
            <div className="grid gap-x-3 gap-y-2 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label className="text-[11px]">Ünvan</Label>
                <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  className="h-8 border-0 border-b rounded-none bg-transparent px-0 text-sm" />
              </div>
              <div><Label className="text-[11px]">Vergi No / TCKN</Label>
                <Input value={customer.taxNo} onChange={(e) => setCustomer({ ...customer, taxNo: e.target.value })}
                  className="h-8 border-0 border-b rounded-none bg-transparent px-0 text-sm" />
              </div>
              <div><Label className="text-[11px]">Telefon</Label>
                <Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  className="h-8 border-0 border-b rounded-none bg-transparent px-0 text-sm" />
              </div>
              <div className="md:col-span-3"><Label className="text-[11px]">Adres</Label>
                <Input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  className="h-8 border-0 border-b rounded-none bg-transparent px-0 text-sm" />
              </div>
              <div><Label className="text-[11px]">E-posta</Label>
                <Input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  className="h-8 border-0 border-b rounded-none bg-transparent px-0 text-sm" />
              </div>
            </div>
          </div>

          {/* Manuel kur + toplu araç — çıktıda gizli */}
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border bg-muted/10 p-3 print:hidden">
            <div>
              <Label className="text-xs">Döviz</Label>
              <Select value={docCurrency} onValueChange={(v) => setDocCurrency(v as Currency)}>
                <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="TRY">TRY (₺)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Manuel Kur (1 {docCurrency} = ? ₺)</Label>
              <Input type="number" step="0.0001" value={manualRate}
                onChange={(e) => setManualRate(+e.target.value)} className="h-9 w-32" />
            </div>
            <div className="h-9 w-px bg-border" />
            <div className="text-xs text-muted-foreground">
              {selected.size > 0 ? `${selected.size} satır seçili` : "Toplu için satır seçin"}
            </div>
            <div>
              <Label className="text-xs">Seçilenlere % artış</Label>
              <div className="flex items-center gap-1">
                <Input type="number" value={bulkMarkup} onChange={(e) => setBulkMarkup(+e.target.value)} className="h-9 w-20" />
                <Button size="sm" variant="outline" onClick={applyBulkMarkup}><Percent className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Genel İskonto %</Label>
              <div className="flex items-center gap-1">
                <Input type="number" value={bulkDiscount} onChange={(e) => setBulkDiscount(+e.target.value)} className="h-9 w-20" />
                <Button size="sm" variant="outline" onClick={applyBulkDiscount}><Percent className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            {selected.size > 0 && (
              <Button size="sm" variant="destructive" onClick={deleteSelected}>
                <Trash2 className="mr-1 h-4 w-4" /> Sil
              </Button>
            )}
          </div>


          {/* Ürün tablosu */}
          <div className="mt-4 overflow-x-auto">
            {rows.length === 0 ? (
              <EmptyState title="Henüz ürün eklenmedi" desc='Sağ üstteki "Ürün Ekle" ile başlayın.' />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 print:hidden">
                      <Checkbox
                        checked={selected.size === lines.length && lines.length > 0 ? true : selected.size > 0 ? "indeterminate" : false}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead className="w-16">Görsel</TableHead>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Stok Kodu</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead className="text-right">Birim Fiyat</TableHead>
                    <TableHead className="text-right">KDV %</TableHead>
                    <TableHead className="text-right">Toplam</TableHead>
                    <TableHead className="w-10 print:hidden"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id} data-state={selected.has(r.id) ? "selected" : undefined}>
                      <TableCell className="print:hidden">
                        <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSel(r.id)} />
                      </TableCell>
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
                      <TableCell className="text-right">
                        <div>{fmtTL(r.unit)}</div>
                        <div className="print:hidden mt-1">
                          <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                            <span>+%</span>
                            <Input type="number" value={r.markup}
                              onChange={(e) => updateLine(r.id, { markup: +e.target.value })}
                              className="h-6 w-16 text-right text-xs" />
                          </div>
                        </div>
                      </TableCell>
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
                    <TableCell colSpan={6} className="text-right font-medium print:hidden">Ara Toplam (KDV Hariç)</TableCell>
                    <TableCell colSpan={5} className="hidden text-right font-medium print:table-cell">Ara Toplam (KDV Hariç)</TableCell>
                    <TableCell className="text-right">{fmtTL(sums.net)}</TableCell>
                    <TableCell colSpan={2} className="print:hidden"></TableCell>
                  </TableRow>
                  {globalDiscount > 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-right text-muted-foreground print:hidden">İskonto (%{globalDiscount})</TableCell>
                      <TableCell colSpan={5} className="hidden text-right text-muted-foreground print:table-cell">İskonto (%{globalDiscount})</TableCell>
                      <TableCell className="text-right text-muted-foreground">-{fmtTL(sums.disc)}</TableCell>
                      <TableCell colSpan={2} className="print:hidden"></TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell colSpan={6} className="text-right font-medium print:hidden">KDV Toplamı</TableCell>
                    <TableCell colSpan={5} className="hidden text-right font-medium print:table-cell">KDV Toplamı</TableCell>
                    <TableCell className="text-right">{fmtTL(sums.vat)}</TableCell>
                    <TableCell colSpan={2} className="print:hidden"></TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/10">
                    <TableCell colSpan={6} className="text-right text-base font-bold print:hidden">GENEL TOPLAM</TableCell>
                    <TableCell colSpan={5} className="hidden text-right text-base font-bold print:table-cell">GENEL TOPLAM</TableCell>
                    <TableCell className="text-right text-base font-bold text-primary">{fmtTL(sums.total)}</TableCell>
                    <TableCell colSpan={2} className="print:hidden"></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </div>

          <div className="mt-8 flex justify-between border-t pt-4 text-xs text-muted-foreground">
            <span>Teklifi Hazırlayan: {company.owner || company.name}</span>
            <span>Kaşe / İmza</span>
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
                  <TableCell className="text-right">
                    {p.currency === "TRY" ? fmtTL(p.price1) : `${p.currency === "USD" ? "$" : "€"}${p.price1.toLocaleString("tr-TR")}`}
                  </TableCell>
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
