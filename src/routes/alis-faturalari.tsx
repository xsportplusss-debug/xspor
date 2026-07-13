import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSpreadsheet, Plus, Search } from "lucide-react";
import { useState } from "react";
import { purchaseInvoices, fmtTL } from "@/lib/mock-data";

export const Route = createFileRoute("/alis-faturalari")({
  head: () => ({
    meta: [
      { title: "Alış Faturaları — Fintra" },
      { name: "description", content: "Tedarikçi alış faturalarını görüntüleyin ve yönetin." },
    ],
  }),
  component: Page,
});

function Page() {
  const [q, setQ] = useState("");
  const filtered = purchaseInvoices.filter((s) => s.no.toLowerCase().includes(q.toLowerCase()) || s.party.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alış Faturaları"
        subtitle="Tedarikçilerden gelen faturaları yönetin."
        actions={
          <>
            <Button variant="outline" size="sm"><Download className="mr-1 h-4 w-4" /> PDF</Button>
            <Button variant="outline" size="sm"><FileSpreadsheet className="mr-1 h-4 w-4" /> Excel</Button>
            <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
              <Plus className="mr-1 h-4 w-4" /> Yeni Alış Faturası
            </Button>
          </>
        }
      />

      <Card className="glass">
        <CardContent className="p-4">
          <div className="mb-4 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Fatura no veya tedarikçi ara..." className="pl-9 max-w-md" />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fatura No</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Tedarikçi</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Ödeme</TableHead>
                  <TableHead className="text-right">Toplam</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.no}</TableCell>
                    <TableCell className="text-muted-foreground">{s.date}</TableCell>
                    <TableCell>{s.party}</TableCell>
                    <TableCell><Badge variant={s.status === "Onaylı" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                    <TableCell><Badge variant={s.payment === "Tahsil Edildi" ? "default" : s.payment === "Kısmi" ? "secondary" : "outline"}>{s.payment}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{fmtTL(s.total)}</TableCell>
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
