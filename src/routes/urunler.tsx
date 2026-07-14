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
import { Textarea } from "@/components/ui/textarea";
import { FileCode2, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fmtTL } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";
import { fetchXml, parseProductXml } from "@/lib/importers";

export const Route = createFileRoute("/urunler")({
  head: () => ({
    meta: [
      { title: "Ürünler — Fintra" },
      { name: "description", content: "Ürün kataloğu — ekleme, silme ve XML içe aktarım." },
    ],
  }),
  component: Page,
});

function Page() {
  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);
  const bulkAddProducts = useStore((s) => s.bulkAddProducts);
  const removeProduct = useStore((s) => s.removeProduct);
  const ensureCategory = useStore((s) => s.ensureCategory);

  const [q, setQ] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [xmlOpen, setXmlOpen] = useState(false);
  const [xmlUrl, setXmlUrl] = useState("");
  const [xmlText, setXmlText] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", barcode: "", category: "" });

  const filtered = products.filter((p) =>
    [p.name, p.sku, p.barcode, p.category].filter(Boolean).some((v) => v.toLowerCase().includes(q.toLowerCase())),
  );

  async function importXml() {
    setLoading(true);
    try {
      const text = xmlText.trim() || (xmlUrl ? await fetchXml(xmlUrl) : "");
      if (!text) { toast.error("URL veya XML metni girin"); return; }
      const parsed = parseProductXml(text);
      if (!parsed.length) { toast.error("XML'de ürün bulunamadı"); return; }
      const items = parsed.map((p) => ({
        name: p.name || p.sku || p.barcode,
        sku: p.sku,
        barcode: p.barcode,
        category: p.category || "",
        brand: "",
        buy: 0, sell: 0, vat: 20, stock: 0, minStock: 0,
      }));
      for (const c of new Set(items.map((i) => i.category).filter(Boolean))) ensureCategory(c);
      bulkAddProducts(items);
      toast.success(`${items.length} ürün içe aktarıldı`);
      setXmlOpen(false); setXmlUrl(""); setXmlText("");
    } catch (e: any) {
      toast.error("İçe aktarım hatası", { description: e.message });
    } finally { setLoading(false); }
  }

  function saveManual() {
    if (!form.name) return toast.error("Ürün adı girin");
    if (form.category) ensureCategory(form.category);
    addProduct({ ...form, brand: "", buy: 0, sell: 0, vat: 20, stock: 0, minStock: 0 });
    setNewOpen(false);
    setForm({ name: "", sku: "", barcode: "", category: "" });
    toast.success("Ürün eklendi");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ürünler"
        subtitle={`${products.length} ürün`}
        actions={
          <>
            <Dialog open={xmlOpen} onOpenChange={setXmlOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><FileCode2 className="mr-1 h-4 w-4" /> XML İçe Aktar</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>XML'den ürün içe aktar</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div>
                    <Label>XML URL'i</Label>
                    <Input value={xmlUrl} onChange={(e) => setXmlUrl(e.target.value)} placeholder="https://tedarikci.com/urunler.xml" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      CORS engeli oluşursa aşağıya XML içeriğini doğrudan yapıştırın.
                    </p>
                  </div>
                  <div>
                    <Label>Veya XML'i yapıştırın</Label>
                    <Textarea rows={6} value={xmlText} onChange={(e) => setXmlText(e.target.value)} placeholder="<Urunler><Urun>..." />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sadece <b>ürün adı</b>, <b>stok kodu</b>, <b>barkod</b> ve <b>kategori</b> etiketleri okunur. Görsel ve fiyat alınmaz.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setXmlOpen(false)} disabled={loading}>İptal</Button>
                  <Button onClick={importXml} disabled={loading} className="gradient-primary text-primary-foreground">
                    {loading ? "Yükleniyor..." : "İçe Aktar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={newOpen} onOpenChange={setNewOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
                  <Plus className="mr-1 h-4 w-4" /> Yeni Ürün
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Yeni Ürün</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Ürün Adı</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Stok Kodu</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
                    <div><Label>Barkod</Label><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></div>
                  </div>
                  <div><Label>Kategori</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                </div>
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
        <EmptyState title="Henüz ürün yok" desc="Yeni ürün ekleyin veya XML'den içe aktarın." />
      ) : (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="mb-4 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, stok kodu, barkod, kategori..." className="pl-9 max-w-md" />
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barkod</TableHead>
                    <TableHead>Stok Kodu</TableHead>
                    <TableHead>Ürün Adı</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Satış</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.barcode}</TableCell>
                      <TableCell className="font-medium">{p.sku}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{p.category && <Badge variant="secondary">{p.category}</Badge>}</TableCell>
                      <TableCell className="text-right">{p.sell ? fmtTL(p.sell) : "—"}</TableCell>
                      <TableCell className="text-right">{p.stock}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => { removeProduct(p.id); toast.success("Silindi"); }}>
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
