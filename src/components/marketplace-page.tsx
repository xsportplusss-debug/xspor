import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, Package, PackageCheck, RotateCcw, Search, Wallet } from "lucide-react";
import { marketplaces, fmtTL } from "@/lib/mock-data";

export function MarketplacePage({ id }: { id: string }) {
  const m = marketplaces.find((x) => x.id === id)!;
  const orders = Array.from({ length: 8 }).map((_, i) => ({
    no: `${m.id.toUpperCase()}-${(1024 + i).toString()}`,
    date: `2026-07-${(12 - i).toString().padStart(2, "0")}`,
    customer: ["Ali K.", "Zeynep D.", "Mert Y.", "Selin A.", "Emre T.", "Deniz Ö.", "Hakan B.", "Ceren N."][i],
    total: 250 + i * 137,
    status: i % 4 === 0 ? "Bekliyor" : i % 3 === 0 ? "Kargoda" : "Teslim Edildi",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={m.name}
        subtitle="Pazaryeri sipariş, komisyon ve tahsilat detayları."
        actions={
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg font-bold text-white" style={{ backgroundColor: m.color }}>
              {m.name[0]}
            </span>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Toplam Sipariş" value={m.orders.toString()} icon={Package} tone="primary" />
        <StatCard label="Bekleyen" value={m.pending.toString()} icon={PackageCheck} tone="warning" />
        <StatCard label="İade" value={m.returns.toString()} icon={RotateCcw} tone="destructive" />
        <StatCard label="Net Kazanç" value={fmtTL(m.net)} icon={Wallet} tone="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="glass"><CardHeader className="pb-2"><CardTitle className="text-base">Komisyonlar</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmtTL(m.commission)}</div><div className="text-xs text-muted-foreground">Bu ay toplam</div></CardContent></Card>
        <Card className="glass"><CardHeader className="pb-2"><CardTitle className="text-base">Kesintiler</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmtTL(m.commission * 0.15)}</div><div className="text-xs text-muted-foreground">Reklam ve hizmet</div></CardContent></Card>
        <Card className="glass"><CardHeader className="pb-2"><CardTitle className="text-base">Kargo</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmtTL(m.orders * 24.9)}</div><div className="text-xs text-muted-foreground">Kargo maliyeti</div></CardContent></Card>
      </div>

      <Card className="glass">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Sipariş Listesi</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Sipariş no..." className="h-9 w-48 pl-9" />
            </div>
            <Button variant="outline" size="sm"><Filter className="mr-1 h-4 w-4" /> Filtre</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Sipariş No</TableHead><TableHead>Tarih</TableHead><TableHead>Alıcı</TableHead>
                <TableHead>Durum</TableHead><TableHead className="text-right">Tutar</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.no}>
                    <TableCell className="font-medium">{o.no}</TableCell>
                    <TableCell className="text-muted-foreground">{o.date}</TableCell>
                    <TableCell>{o.customer}</TableCell>
                    <TableCell><Badge variant={o.status === "Teslim Edildi" ? "default" : o.status === "Kargoda" ? "secondary" : "outline"}>{o.status}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{fmtTL(o.total)}</TableCell>
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
