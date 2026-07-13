import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { cariList, fmtTL } from "@/lib/mock-data";

export const Route = createFileRoute("/tedarikciler")({
  head: () => ({
    meta: [
      { title: "Tedarikçiler — Fintra" },
      { name: "description", content: "Tedarikçi listesi ve ödenecek bakiyeler." },
    ],
  }),
  component: Page,
});

function Page() {
  const list = cariList.filter((c) => c.type === "Tedarikçi");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tedarikçiler"
        subtitle={`${list.length} kayıtlı tedarikçi`}
        actions={<Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant"><Plus className="mr-1 h-4 w-4" /> Yeni Tedarikçi</Button>}
      />
      <Card className="glass">
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead><TableHead>Ünvan</TableHead><TableHead>Telefon</TableHead>
                  <TableHead>Vergi No</TableHead><TableHead>Durum</TableHead><TableHead className="text-right">Borç</TableHead>
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
                    <TableCell className="text-right font-semibold text-destructive">{fmtTL(Math.abs(c.balance))}</TableCell>
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
