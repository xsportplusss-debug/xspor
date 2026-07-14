import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Tags, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";

export const Route = createFileRoute("/kategoriler")({
  head: () => ({
    meta: [
      { title: "Kategoriler — Fintra" },
      { name: "description", content: "Ürünlerin kategorileri." },
    ],
  }),
  component: Page,
});

function Page() {
  const categories = useStore((s) => s.categories);
  const products = useStore((s) => s.products);
  const removeCategory = useStore((s) => s.removeCategory);

  return (
    <div className="space-y-6">
      <PageHeader title="Kategoriler" subtitle={`${categories.length} kategori`} />

      {categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Henüz kategori yok"
          desc="Ürünler sayfasından XML içe aktardığınızda kategoriler otomatik oluşur."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((c) => {
            const items = products.filter((p) => (p.category || "").toLowerCase() === c.name.toLowerCase());
            return (
              <Sheet key={c.id}>
                <Card className="glass transition-transform hover:-translate-y-0.5 hover:shadow-elegant">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Tags className="h-6 w-6" />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => { removeCategory(c.id); toast.success("Silindi"); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
      )}
    </div>
  );
}
