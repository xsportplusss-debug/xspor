import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtTL } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/musteriler")({
  head: () => ({
    meta: [
      { title: "Müşteriler — Fintra" },
      { name: "description", content: "Müşteri listesi." },
    ],
  }),
  component: Page,
});

function Page() {
  const list = useStore((s) => s.cariList.filter((c) => c.type === "Müşteri"));
  return (
    <div className="space-y-6">
      <PageHeader title="Müşteriler" subtitle={`${list.length} müşteri`} />
      {list.length === 0 ? (
        <EmptyState title="Henüz müşteri yok" desc="Cari Hesaplar sayfasından 'Müşteri' tipinde kayıt ekleyin." />
      ) : (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead><TableHead>Ünvan</TableHead><TableHead>Telefon</TableHead>
                    <TableHead>Vergi No</TableHead><TableHead>Durum</TableHead><TableHead className="text-right">Bakiye</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.code}</TableCell>
                      <TableCell>{c.title}</TableCell>
                      <TableCell className="text-muted-foreground">{c.phone}</TableCell>
                      <TableCell className="text-muted-foreground">{c.taxNo}</TableCell>
                      <TableCell><Badge variant={c.status === "Aktif" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                      <TableCell className={`text-right font-semibold ${c.balance >= 0 ? "text-success" : "text-destructive"}`}>{fmtTL(c.balance)}</TableCell>
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
