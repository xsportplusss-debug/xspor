import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { stockMovements } from "@/lib/mock-data";

export const Route = createFileRoute("/stok-hareketleri")({
  head: () => ({
    meta: [
      { title: "Stok Hareketleri — Fintra" },
      { name: "description", content: "Ürün giriş çıkış hareketleri." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Stok Hareketleri" subtitle="Depodaki giriş ve çıkışlar." />
      <Card className="glass">
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead><TableHead>Ürün</TableHead><TableHead>Tip</TableHead>
                  <TableHead>Referans</TableHead><TableHead className="text-right">Miktar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockMovements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground">{m.date}</TableCell>
                    <TableCell className="font-medium">{m.product}</TableCell>
                    <TableCell>
                      <Badge variant={m.type === "Giriş" ? "default" : "secondary"}>{m.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{m.ref}</TableCell>
                    <TableCell className={`text-right font-semibold ${m.type === "Giriş" ? "text-success" : "text-destructive"}`}>
                      {m.type === "Giriş" ? "+" : "-"}{m.qty}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
