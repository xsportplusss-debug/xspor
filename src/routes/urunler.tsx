import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List, Package as PackageIcon, Plus, Search } from "lucide-react";
import { useState } from "react";
import { products, fmtTL } from "@/lib/mock-data";

export const Route = createFileRoute("/urunler")({
  head: () => ({
    meta: [
      { title: "Ürünler — Fintra" },
      { name: "description", content: "Ürün kataloğu, barkod, SKU, alış/satış ve stok bilgileri." },
    ],
  }),
  component: Page,
});

function Page() {
  const [q, setQ] = useState("");
  const filtered = products.filter((p) =>
    [p.name, p.sku, p.barcode, p.category, p.brand].some((v) => v.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ürünler"
        subtitle={`${products.length} ürün — ${products.filter((p) => p.stock < p.minStock).length} kritik stok`}
        actions={<Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant"><Plus className="mr-1 h-4 w-4" /> Yeni Ürün</Button>}
      />

      <Tabs defaultValue="cards">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ürün adı, SKU, barkod..." className="pl-9" />
          </div>
          <TabsList>
            <TabsTrigger value="cards"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="table"><List className="h-4 w-4" /></TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="cards" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <Card key={p.id} className="glass overflow-hidden">
                <CardContent className="p-4">
                  <div className="mb-3 grid h-24 place-items-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                    <PackageIcon className="h-10 w-10 text-primary/60" />
                  </div>
                  <div className="text-sm font-semibold line-clamp-1">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.sku} · {p.brand}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm font-bold">{fmtTL(p.sell)}</div>
                    <Badge variant={p.stock < p.minStock ? "destructive" : "secondary"} className="text-[10px]">
                      Stok {p.stock}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <Card className="glass">
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barkod</TableHead><TableHead>SKU</TableHead><TableHead>Ürün</TableHead>
                      <TableHead>Kategori</TableHead><TableHead>Marka</TableHead>
                      <TableHead className="text-right">Alış</TableHead><TableHead className="text-right">Satış</TableHead>
                      <TableHead className="text-right">KDV</TableHead><TableHead className="text-right">Stok</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.barcode}</TableCell>
                        <TableCell className="font-medium">{p.sku}</TableCell>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>{p.category}</TableCell>
                        <TableCell className="text-muted-foreground">{p.brand}</TableCell>
                        <TableCell className="text-right">{fmtTL(p.buy)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmtTL(p.sell)}</TableCell>
                        <TableCell className="text-right">%{p.vat}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={p.stock < p.minStock ? "destructive" : "secondary"}>{p.stock}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
