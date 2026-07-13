import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { cariList, fmtTL } from "@/lib/mock-data";

export const Route = createFileRoute("/musteriler")({
  head: () => ({
    meta: [
      { title: "Müşteriler — Fintra" },
      { name: "description", content: "Müşteri listesi ve bakiyeleri." },
    ],
  }),
  component: Page,
});

function Page() {
  const list = cariList.filter((c) => c.type === "Müşteri");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Müşteriler"
        subtitle={`${list.length} kayıtlı müşteri`}
        actions={<Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant"><Plus className="mr-1 h-4 w-4" /> Yeni Müşteri</Button>}
      />
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
                    <TableCell className="text-right font-semibold text-success">{fmtTL(c.balance)}</TableCell>
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
