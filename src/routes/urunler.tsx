import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, ImageOff, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fmtTL, type Product, type Currency } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";
import { ExcelImportDialog } from "@/components/excel-import-dialog";
import { useSelection } from "@/hooks/use-selection";
import { PRODUCT_TEMPLATE_HEADERS, rowsToProducts } from "@/lib/importers";
import { useFxRates, toTRY } from "@/lib/fx";

export const Route = createFileRoute("/urunler")({
  head: () => ({
    meta: [
      { title: "Ürünler — Fintra" },
      { name: "description", content: "Ürün kataloğu — Excel içe aktar, düzenle, sil." },
    ],
  }),
  component: Page,
});

const emptyForm = (): Omit<Product, "id"> => ({
  name: "", sku: "", barcode: "", category: "", brand: "", image: "",
  price1: 0, currency: "TRY", tax: 20, buy: 0, sell: 0, vat: 20, stock: 0, minStock: 0, kur: 1,
});

const curSymbol = (c: Currency) => (c === "USD" ? "$" : c === "EUR" ? "€" : c === "GBP" ? "£" : "₺");

function Page() {
  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);
  const bulkAddProducts = useStore((s) => s.bulkAddProducts);
  const updateProduct = useStore((s) => s.updateProduct);
  const removeProduct = useStore((s) => s.removeProduct);
  const bulkRemove = useStore((s) => s.bulkRemoveProducts);
  const ensureCategory = useStore((s) => s.ensureCategory);
  const { rates, loading, refresh } = useFxRates();

  const [q, setQ] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState<Omit<Product, "id">>(emptyForm());
  const [editing, setEditing] = useState<Product | null>(null);

  const filtered = products.filter((p) =>
    [p.name, p.sku, p.barcode, p.category, p.brand].filter(Boolean).some((v) => v.toLowerCase().includes(q.toLowerCase())),
  );
  const sel = useSelection(filtered);

  function importExcel(rows: any[]) {
    const list = rowsToProducts(rows);
    for (const c of new Set(list.map((i) => i.category).filter(Boolean))) ensureCategory(c);
    bulkAddProducts(list);
    return list.length;
  }

  function saveManual() {
    if (!form.name) return toast.error("Ürün adı girin");
    if (form.category) ensureCategory(form.category);
    const tryPrice = toTRY(form.price1, form.currency, rates);
    const sell = +(tryPrice * (1 + form.tax / 100)).toFixed(2);
    addProduct({ ...form, sell, vat: form.tax });
    setNewOpen(false);
    setForm(emptyForm());
    toast.success("Ürün eklendi");
  }

  function saveEdit() {
    if (!editing) return;
    if (editing.category) ensureCategory(editing.category);
    const tryPrice = toTRY(editing.price1, editing.currency, rates);
    const sell = +(tryPrice * (1 + editing.tax / 100)).toFixed(2);
    updateProduct(editing.id, { ...editing, sell, vat: editing.tax });
    setEditing(null);
    toast.success("Güncellendi");
  }

  function bulkDelete() {
    bulkRemove(sel.selectedIds);
    toast.success(`${sel.selectedIds.length} ürün silindi`);
    sel.clear();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ürünler"
        subtitle={`${products.length} ürün · USD ${rates.USD.toFixed(2)} ₺ · EUR ${rates.EUR.toFixed(2)} ₺`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Kuru Güncelle
            </Button>
            <ExcelImportDialog
              title="Ürünleri Excel'den içe aktar"
              description="Sütunlar: picture1Path, label, brand, stockCode, barcode, mainCategory, price1, currency (TRY/USD/EUR), tax. Döviz seçilirse KDV dahil TL fiyatı güncel kurdan hesaplanır."
              templateName="urunler-sablon.xlsx"
              templateHeaders={PRODUCT_TEMPLATE_HEADERS}
              templateSample={[["https://cdn.orn/urun.jpg", "Örnek Ürün", "Marka", "STK-001", "8690000000001", "Kategori", 100, "USD", 20]]}
              onImport={importExcel}
              trigger={<Button variant="outline" size="sm"><FileSpreadsheet className="mr-1 h-4 w-4" /> Excel İçe Aktar</Button>}
            />
            <Dialog open={newOpen} onOpenChange={setNewOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
                  <Plus className="mr-1 h-4 w-4" /> Yeni Ürün
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Yeni Ürün</DialogTitle></DialogHeader>
                <ProductForm value={form} onChange={setForm} rates={rates} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewOpen(false)}>İptal</Button>
                  <Button onClick={saveManual} className="gradient-primary text-primary-foreground">Kaydet</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {products.length === 0 ? (
        <EmptyState title="Henüz ürün yok" desc="Yeni ürün ekleyin veya Excel'den içe aktarın." />
      ) : (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, marka, stok kodu, barkod, kategori..." className="pl-9" />
              </div>
              {sel.selectedIds.length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={() => {
                    let n = 0;
                    for (const id of sel.selectedIds) {
                      const p = products.find((x) => x.id === id); if (!p) continue;
                      const kur = p.kur || 1;
                      const np1 = +((p.buy || 0) * (1 + (p.tax || 0) / 100) * kur).toFixed(2);
                      updateProduct(id, { price1: np1, currency: "TRY", sell: np1, vat: p.tax });
                      n++;
                    }
                    toast.success(`${n} ürünün fiyatı güncellendi`, { description: "Formül: Alış × KDV × Kur" });
                  }}>
                    <RefreshCw className="mr-1 h-4 w-4" /> Fiyatları Güncelle ({sel.selectedIds.length})
                  </Button>
                  <Button variant="destructive" size="sm" onClick={bulkDelete}>
                    <Trash2 className="mr-1 h-4 w-4" /> Seçilenleri Sil ({sel.selectedIds.length})
                  </Button>
                </>
              )}
            </div>
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
                    <TableHead className="w-16">Resim</TableHead>
                    <TableHead>Ürün Adı</TableHead>
                    <TableHead>Marka</TableHead>
                    <TableHead>Stok Kodu</TableHead>
                    <TableHead>Barkod</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Toptan</TableHead>
                    <TableHead className="text-right">KDV %</TableHead>
                    <TableHead className="text-right">KDV Dahil (₺)</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const tl = toTRY(p.price1, p.currency, rates);
                    const inc = +(tl * (1 + p.tax / 100)).toFixed(2);
                    return (
                      <TableRow key={p.id} data-state={sel.selected.has(p.id) ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox checked={sel.selected.has(p.id)} onCheckedChange={() => sel.toggle(p.id)} />
                        </TableCell>
                        <TableCell>
                          {p.image ? (
                            <img src={p.image} alt={p.name} loading="lazy" className="h-10 w-10 rounded-md object-cover border" />
                          ) : (
                            <div className="grid h-10 w-10 place-items-center rounded-md border bg-muted text-muted-foreground"><ImageOff className="h-4 w-4" /></div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate font-medium">{p.name}</TableCell>
                        <TableCell>{p.brand}</TableCell>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell className="font-mono text-xs">{p.barcode}</TableCell>
                        <TableCell>{p.category && <Badge variant="secondary">{p.category}</Badge>}</TableCell>
                        <TableCell className="text-right">
                          <div>{curSymbol(p.currency)}{p.price1.toLocaleString("tr-TR")}</div>
                          {p.currency !== "TRY" && <div className="text-xs text-muted-foreground">≈ {fmtTL(tl)}</div>}
                        </TableCell>
                        <TableCell className="text-right">%{p.tax}</TableCell>
                        <TableCell className="text-right font-semibold">{fmtTL(inc)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setEditing(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { removeProduct(p.id); toast.success("Silindi"); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ürünü Düzenle</DialogTitle></DialogHeader>
          {editing && <ProductForm value={editing} onChange={(v) => setEditing({ ...editing, ...v })} rates={rates} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>İptal</Button>
            <Button onClick={saveEdit} className="gradient-primary text-primary-foreground">Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductForm({ value, onChange, rates }: { value: any; onChange: (v: any) => void; rates: { USD: number; EUR: number; GBP: number } }) {
  const set = (patch: any) => onChange({ ...value, ...patch });
  const tl = value.currency === "TRY" ? value.price1 : value.price1 * (value.currency === "USD" ? rates.USD : value.currency === "EUR" ? rates.EUR : rates.GBP);
  const kdvDahil = +(tl * (1 + value.tax / 100)).toFixed(2);
  return (
    <div className="grid gap-3">
      <div><Label>Resim URL (picture1Path)</Label><Input value={value.image ?? ""} onChange={(e) => set({ image: e.target.value })} /></div>
      <div><Label>Ürün Adı (label)</Label><Input value={value.name} onChange={(e) => set({ name: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Marka</Label><Input value={value.brand} onChange={(e) => set({ brand: e.target.value })} /></div>
        <div><Label>Kategori (mainCategory)</Label><Input value={value.category} onChange={(e) => set({ category: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Stok Kodu</Label><Input value={value.sku} onChange={(e) => set({ sku: e.target.value })} /></div>
        <div><Label>Barkod</Label><Input value={value.barcode} onChange={(e) => set({ barcode: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div><Label>Alış Fiyatı</Label><Input type="number" value={value.buy ?? 0} onChange={(e) => set({ buy: +e.target.value })} /></div>
        <div><Label>KDV %</Label><Input type="number" value={value.tax ?? 20} onChange={(e) => set({ tax: +e.target.value })} /></div>
        <div><Label>Kur (manuel)</Label><Input type="number" step="0.01" value={value.kur ?? 1} onChange={(e) => set({ kur: +e.target.value })} /></div>
        <div><Label>Toptan (price1)</Label><Input type="number" value={value.price1 ?? 0} onChange={(e) => set({ price1: +e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div>
          <Label>Para Birimi</Label>
          <Select value={value.currency} onValueChange={(v) => set({ currency: v as Currency })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TRY">₺ TRY</SelectItem>
              <SelectItem value="USD">$ USD</SelectItem>
              <SelectItem value="EUR">€ EUR</SelectItem>
              <SelectItem value="GBP">£ GBP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-3 flex items-end">
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => {
            const np1 = +((value.buy || 0) * (1 + (value.tax || 0) / 100) * (value.kur || 1)).toFixed(2);
            set({ price1: np1, currency: "TRY" });
          }}>
            <RefreshCw className="mr-1 h-4 w-4" /> Fiyatları Güncelle · Alış × KDV × Kur
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {value.currency !== "TRY" && <>Kur: 1 {value.currency} ≈ {(value.currency === "USD" ? rates.USD : value.currency === "EUR" ? rates.EUR : rates.GBP).toFixed(2)} ₺ · </>}
        KDV Dahil: <span className="font-semibold text-foreground">{fmtTL(kdvDahil || 0)}</span>
      </p>
    </div>
  );
}
