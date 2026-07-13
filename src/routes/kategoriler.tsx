import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tags, Plus } from "lucide-react";
import { categories } from "@/lib/mock-data";

export const Route = createFileRoute("/kategoriler")({
  head: () => ({
    meta: [
      { title: "Kategoriler — Fintra" },
      { name: "description", content: "Ürün kategorilerini yönetin." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Kategoriler"
        subtitle="Ürün kategorileri ve dağılım."
        actions={<Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant"><Plus className="mr-1 h-4 w-4" /> Yeni Kategori</Button>}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories.map((c) => (
          <Card key={c.id} className="glass">
            <CardContent className="p-5">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <Tags className="h-6 w-6" />
              </div>
              <div className="mt-3 text-lg font-semibold">{c.name}</div>
              <div className="text-sm text-muted-foreground">{c.products} ürün</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
