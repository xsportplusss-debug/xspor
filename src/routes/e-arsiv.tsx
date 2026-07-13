import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { salesInvoices, fmtTL } from "@/lib/mock-data";

export const Route = createFileRoute("/e-arsiv")({
  head: () => ({
    meta: [
      { title: "E-Arşiv — Fintra" },
      { name: "description", content: "E-Arşiv faturalarını görüntüleyin ve indirin." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="E-Arşiv" subtitle="Elektronik arşiv faturalarınız." />
      <Card className="glass">
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ETTN</TableHead>
                  <TableHead>Fatura No</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Alıcı</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesInvoices.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{`${s.id}a-${s.no.slice(-4)}-e8f2`}</TableCell>
                    <TableCell className="font-medium">{s.no}</TableCell>
                    <TableCell className="text-muted-foreground">{s.date}</TableCell>
                    <TableCell>{s.party}</TableCell>
                    <TableCell><Badge>Gönderildi</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{fmtTL(s.total)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon"><FileText className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
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
