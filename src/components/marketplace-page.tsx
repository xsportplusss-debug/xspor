import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Store, Settings2, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { getMarketplace } from "@/services/marketplaces";
import { fmtTL } from "@/lib/mock-data";

export function MarketplacePage({ id }: { id: string }) {
  const meta = getMarketplace(id);
  const name = meta?.name ?? id;
  const cfg = useStore((s) => s.marketplaceConfigs[id]);
  const orders = useStore((s) => s.marketplaceOrders.filter((o) => o.marketplace === id));

  const sums = orders.reduce(
    (a, o) => ({ amount: a.amount + o.amount, commission: a.commission + o.commission, net: a.net + o.net }),
    { amount: 0, commission: 0, net: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={name}
        subtitle={cfg?.connected ? "Bağlı — siparişleri çekmek için ayarlar sayfasını kullanın." : "Henüz bağlı değil."}
        actions={
          <>
            {cfg?.connected && <Badge className="bg-success text-success-foreground gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Bağlı</Badge>}
            <Link to="/pazaryerleri/ayarlar">
              <Button size="sm" variant="outline"><Settings2 className="mr-1 h-4 w-4" /> API Ayarları</Button>
            </Link>
          </>
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={Store}
          title={`${name} siparişi yok`}
          desc={cfg?.connected ? "Ayarlar sayfasından 'Siparişleri Çek' butonuna basın." : "API bilgilerinizi girip bağlantıyı kurun."}
        />
      ) : (
        <Card className="glass"><CardContent className="p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sipariş No</TableHead><TableHead>Tarih</TableHead>
                  <TableHead>Müşteri</TableHead><TableHead>Durum</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead className="text-right">Komisyon</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.orderNo}</TableCell>
                    <TableCell className="text-muted-foreground">{o.date}</TableCell>
                    <TableCell>{o.customer}</TableCell>
                    <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                    <TableCell className="text-right">{fmtTL(o.amount)}</TableCell>
                    <TableCell className="text-right text-destructive">-{fmtTL(o.commission)}</TableCell>
                    <TableCell className="text-right font-semibold text-success">{fmtTL(o.net)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/40">
                  <TableCell colSpan={4} className="font-medium">Toplam</TableCell>
                  <TableCell className="text-right font-semibold">{fmtTL(sums.amount)}</TableCell>
                  <TableCell className="text-right font-semibold text-destructive">-{fmtTL(sums.commission)}</TableCell>
                  <TableCell className="text-right font-semibold text-success">{fmtTL(sums.net)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
