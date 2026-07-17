import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";
import { useSelection } from "@/hooks/use-selection";
import { toast } from "sonner";

export const Route = createFileRoute("/kategoriler")({
  head: () => ({
    meta: [
      { title: "Kategoriler — Fintra" },
      { name: "description", content: "Ürün kategorilerini ekleyin, düzenleyin, silin." },
    ],
  }),
  component: Page,
});

function Page() {
  const categories = useStore((s) => s.categories);
  const products = useStore((s) => s.products);
  const addCategory = useStore((s) => s.addCategory);
  const updateCategory = useStore((s) => s.updateCategory);
  const removeCategory = useStore((s) => s.removeCategory);
  const bulkRemove = useStore((s) => s.bulkRemoveCategories);

  const [name, setName] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const sel = useSelection(categories);

  const save = () => {
    if (!name.trim()) return toast.error("Ad girin");
    addCategory(name.trim());
    setName(""); setOpenNew(false);
    toast.success("Eklendi");
  };
  const saveEdit = () => {
    if (!editing || !editing.name.trim()) return;
    updateCategory(editing.id, editing.name.trim());
    setEditing(null);
    toast.success("Güncellendi");
  };
  const bulkDelete = () => {
    bulkRemove(sel.selectedIds);
    toast.success(`${sel.selectedIds.length} kategori silindi`);
    sel.clear();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kategoriler"
        subtitle={`${categories.length} kategori`}
        actions={
          <>
            {sel.selectedIds.length > 0 && (
              <Button variant="destructive" size="sm" onClick={bulkDelete}>
                <Trash2 className="mr-1 h-4 w-4" /> Seçilenleri Sil ({sel.selectedIds.length})
              </Button>
            )}
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
                  <Plus className="mr-1 h-4 w-4" /> Yeni Kategori
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Yeni Kategori</DialogTitle></DialogHeader>
                <div className="grid gap-2">
                  <Label>Kategori Adı</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Elektronik" />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenNew(false)}>İptal</Button>
                  <Button onClick={save} className="gradient-primary text-primary-foreground">Kaydet</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Henüz kategori yok"
          desc="Yeni kategori ekleyin veya ürün içe aktarımında otomatik oluşturun."
        />
      ) : (
        <>
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              id="all-cat"
              checked={sel.allChecked ? true : sel.someChecked ? "indeterminate" : false}
              onCheckedChange={sel.toggleAll}
            />
            <label htmlFor="all-cat" className="text-sm text-muted-foreground cursor-pointer">Tümünü seç</label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((c) => {
              const items = products.filter((p) => (p.category || "").toLowerCase() === c.name.toLowerCase());
              const checked = sel.selected.has(c.id);
              return (
                <Sheet key={c.id}>
                  <Card className={`glass transition-transform hover:-translate-y-0.5 hover:shadow-elegant ${checked ? "ring-2 ring-primary" : ""}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={checked} onCheckedChange={() => sel.toggle(c.id)} />
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                            <Tags className="h-5 w-5" />
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditing({ id: c.id, name: c.name })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { removeCategory(c.id); toast.success("Silindi"); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 text-lg font-semibold">{c.name}</div>
                      <div className="text-sm text-muted-foreground">{items.length} ürün</div>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm" className="mt-3 w-full">Ürünleri Gör</Button>
                      </SheetTrigger>
                    </CardContent>
                  </Card>
                  <SheetContent className="w-full sm:max-w-lg">
                    <SheetHeader>
                      <SheetTitle>{c.name}</SheetTitle>
                      <SheetDescription>{items.length} ürün bu kategoride</SheetDescription>
                    </SheetHeader>
                    <div className="mt-4 space-y-2">
                      {items.length === 0 && <div className="text-sm text-muted-foreground">Bu kategoride ürün yok.</div>}
                      {items.map((p) => (
                        <div key={p.id} className="rounded-lg border p-3">
                          <div className="text-sm font-semibold">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.sku} · {p.barcode}</div>
                        </div>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Kategoriyi Düzenle</DialogTitle></DialogHeader>
          <div className="grid gap-2">
            <Label>Kategori Adı</Label>
            <Input value={editing?.name ?? ""} onChange={(e) => editing && setEditing({ ...editing, name: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>İptal</Button>
            <Button onClick={saveEdit} className="gradient-primary text-primary-foreground">Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
