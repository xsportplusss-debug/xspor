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
import { FileSpreadsheet, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fmtTL, type Product } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";
import { ExcelImportDialog } from "@/components/excel-import-dialog";
import { useSelection } from "@/hooks/use-selection";
import { PRODUCT_TEMPLATE_HEADERS, rowsToProducts } from "@/lib/importers";

export const Route = createFileRoute("/urunler")({
  head: () => ({
    meta: [
      { title: "Ürünler — Fintra" },
      { name: "description", content: "Ürün kataloğu — Excel içe aktar, düzenle, sil." },
    ],
  }),
  component: Page,
});

const emptyForm = () => ({ name: "", sku: "", barcode: "", category: "", buy: 0, sell: 0, vat: 20, stock: 0, minStock: 0, brand: "" });

function Page() {
  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);
  const bulkAddProducts = useStore((s) => s.bulkAddProducts);
  const updateProduct = useStore((s) => s.updateProduct);
  const removeProduct = useStore((s) => s.removeProduct);
  const bulkRemove = useStore((s) => s.bulkRemoveProducts);
  const ensureCategory = useStore((s) => s.ensureCategory);

  const [q, setQ] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState<Product | null>(null);

  const filtered = products.filter((p) =>
    [p.name, p.sku, p.barcode, p.category].filter(Boolean).some((v) => v.toLowerCase().includes(q.toLowerCase())),
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
    addProduct(form);
    setNewOpen(false);
    setForm(emptyForm());
    toast.success("Ürün eklendi");
  }

  function saveEdit() {
    if (!editing) return;
    if (editing.category) ensureCategory(editing.category);
    updateProduct(editing.id, editing);
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
        subtitle={`${products.length} ürün`}
        actions={
          <>
            <ExcelImportDialog
              title="Ürünleri Excel'den içe aktar"
              description="Barkod veya stok kodu daha önce eklenmişse tekrar eklenmez."
              templateName="urunler-sablon.xlsx"
              templateHeaders={PRODUCT_TEMPLATE_HEADERS}
              templateSample={[["Örnek Ürün", "STK-001", "8690000000001", "Genel"]]}
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
                <ProductForm value={form} onChange={setForm} />
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
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, stok kodu, barkod, kategori..." className="pl-9" />
              </div>
              {sel.selectedIds.length > 0 && (
                <Button variant="destructive" size="sm" onClick={bulkDelete}>
                  <Trash2 className="mr-1 h-4 w-4" /> Seçilenleri Sil ({sel.selectedIds.length})
                </Button>
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
                    <TableHead>Barkod</TableHead>
                    <TableHead>Stok Kodu</TableHead>
                    <TableHead>Ürün Adı</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Satış</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id} data-state={sel.selected.has(p.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox checked={sel.selected.has(p.id)} onCheckedChange={() => sel.toggle(p.id)} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.barcode}</TableCell>
                      <TableCell className="font-medium">{p.sku}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{p.category && <Badge variant="secondary">{p.category}</Badge>}</TableCell>
                      <TableCell className="text-right">{p.sell ? fmtTL(p.sell) : "—"}</TableCell>
                      <TableCell className="text-right">{p.stock}</TableCell>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ürünü Düzenle</DialogTitle></DialogHeader>
          {editing && <ProductForm value={editing} onChange={(v) => setEditing({ ...editing, ...v })} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>İptal</Button>
            <Button onClick={saveEdit} className="gradient-primary text-primary-foreground">Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductForm({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const set = (patch: any) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-3">
      <div><Label>Ürün Adı</Label><Input value={value.name} onChange={(e) => set({ name: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Stok Kodu</Label><Input value={value.sku} onChange={(e) => set({ sku: e.target.value })} /></div>
        <div><Label>Barkod</Label><Input value={value.barcode} onChange={(e) => set({ barcode: e.target.value })} /></div>
      </div>
      <div><Label>Kategori</Label><Input value={value.category} onChange={(e) => set({ category: e.target.value })} /></div>
      <div className="grid grid-cols-3 gap-2">
        <div><Label>Alış</Label><Input type="number" value={value.buy ?? 0} onChange={(e) => set({ buy: +e.target.value })} /></div>
        <div><Label>Satış</Label><Input type="number" value={value.sell ?? 0} onChange={(e) => set({ sell: +e.target.value })} /></div>
        <div><Label>Stok</Label><Input type="number" value={value.stock ?? 0} onChange={(e) => set({ stock: +e.target.value })} /></div>
      </div>
    </div>
  );
}
