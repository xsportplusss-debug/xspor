import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { expenses, fmtTL } from "@/lib/mock-data";

export const Route = createFileRoute("/giderler")({
  head: () => ({
    meta: [
      { title: "Giderler — Fintra" },
      { name: "description", content: "Firma gider listesi ve kategorileri." },
    ],
  }),
  component: Page,
});

function Page() {
  const cats = Array.from(new Set(expenses.map((e) => e.category)));
  return (
    <div className="space-y-6">
      <PageHeader
        title="Giderler"
        subtitle="Fatura dışı gider kalemleri."
        actions={<Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant"><Plus className="mr-1 h-4 w-4" /> Yeni Gider</Button>}
      />
      <Tabs defaultValue="liste">
        <TabsList><TabsTrigger value="liste">Liste</TabsTrigger><TabsTrigger value="kat">Kategori</TabsTrigger></TabsList>
        <TabsContent value="liste" className="mt-4">
          <Card className="glass"><CardContent className="p-4">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Tarih</TableHead><TableHead>Kategori</TableHead><TableHead>Açıklama</TableHead><TableHead className="text-right">Tutar</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {expenses.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">{r.date}</TableCell>
                    <TableCell>{r.category}</TableCell>
                    <TableCell>{r.desc}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">{fmtTL(r.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="kat" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cats.map((c) => (
              <Card key={c} className="glass"><CardContent className="p-5">
                <div className="text-xs text-muted-foreground">{c}</div>
                <div className="mt-1 text-xl font-bold">{fmtTL(expenses.filter((e) => e.category === c).reduce((a, b) => a + b.amount, 0))}</div>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
