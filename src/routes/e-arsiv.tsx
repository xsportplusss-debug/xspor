import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Archive, Download, FileText } from "lucide-react";
import { fmtTL } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/e-arsiv")({
  head: () => ({
    meta: [
      { title: "E-Arşiv — Fintra" },
      { name: "description", content: "Elektronik arşiv fatura kayıtları." },
    ],
  }),
  component: Page,
});

function Page() {
  const list = useStore((s) => s.salesInvoices);
  return (
    <div className="space-y-6">
      <PageHeader title="E-Arşiv" subtitle={`${list.length} kayıt`} />
      {list.length === 0 ? (
        <EmptyState icon={Archive} title="E-Arşiv kaydı yok" desc="Satış Faturaları eklendiğinde burada listelenir." />
      ) : (
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
                  {list.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{`${s.id.slice(0, 4)}-${s.no.slice(-4)}`}</TableCell>
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
      )}
    </div>
  );
}
