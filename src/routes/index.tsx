import { createFileRoute, Link } from "@tanstack/react-router";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Wallet, Landmark, TrendingUp, TrendingDown, Package, ShoppingBag, ArrowUpRight, AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Legend,
} from "recharts";
import { useMemo } from "react";
import { fmtTL } from "@/lib/mock-data";
import { useStore, bankBalance, cashBalance } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Fintra Ön Muhasebe" },
      { name: "description", content: "Satış, kasa, banka, cari ve stok özetlerini tek bakışta görün." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const banks = useStore((s) => s.banks);
  const cashes = useStore((s) => s.cashRegisters);
  const salesInvoices = useStore((s) => s.salesInvoices);
  const purchaseInvoices = useStore((s) => s.purchaseInvoices);
  const products = useStore((s) => s.products);
  const bankTx = useStore((s) => s.bankTx);
  const cashTx = useStore((s) => s.cashTx);

  const totalBank = banks.reduce((a, b) => a + bankBalance(b.id), 0);
  const totalCash = cashes.reduce((a, c) => a + cashBalance(c.id), 0);
  const monthSales = salesInvoices.reduce((a, b) => a + b.total, 0);
  const monthBuys = purchaseInvoices.reduce((a, b) => a + b.total, 0);

  const chart = useMemo(() => {
    const map = new Map<string, { m: string; gelir: number; gider: number }>();
    for (const t of [...bankTx, ...cashTx]) {
      const key = (t.date || "").slice(0, 7) || "—";
      if (!map.has(key)) map.set(key, { m: key, gelir: 0, gider: 0 });
      const r = map.get(key)!;
      if (t.amount >= 0) r.gelir += t.amount; else r.gider += -t.amount;
    }
    return [...map.values()].sort((a, b) => (a.m < b.m ? -1 : 1));
  }, [bankTx, cashTx]);

  const lowStock = products.filter((p) => p.minStock > 0 && p.stock < p.minStock);
  const isEmpty = banks.length + cashes.length + salesInvoices.length + purchaseInvoices.length + products.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hoş geldin 👋"
        subtitle="Bugünün özeti ve genel bakış."
        actions={
          <Link to="/satis-faturalari">
            <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
              <ArrowUpRight className="mr-1 h-4 w-4" /> Yeni Fatura
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Toplam Satış" value={fmtTL(monthSales)} icon={ShoppingBag} tone="primary" />
        <StatCard label="Toplam Alış" value={fmtTL(monthBuys)} icon={TrendingDown} tone="warning" />
        <StatCard label="Kasa" value={fmtTL(totalCash)} icon={Wallet} tone="info" hint={`${cashes.length} kasa`} />
        <StatCard label="Banka" value={fmtTL(totalBank)} icon={Landmark} tone="success" hint={`${banks.length} hesap`} />
      </div>

      {isEmpty && (
        <Card className="glass border-dashed">
          <CardContent className="grid place-items-center gap-3 p-10 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Package className="h-7 w-7" />
            </div>
            <div>
              <div className="text-base font-semibold">Hoş geldin!</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Sol menüden Banka, Kasa, Cari ve Ürünler ekleyerek başlayın. Faturaları Excel/PDF, ürünleri XML ile içe aktarabilirsiniz.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {chart.length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gelir / Gider (Aylık)</CardTitle>
            <p className="text-xs text-muted-foreground">Banka ve kasa hareketlerinden</p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tickLine={false} axisLine={false} className="text-xs" />
                <RTooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => fmtTL(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="gelir" name="Gelir" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="gider" name="Gider" fill="var(--color-chart-5)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {salesInvoices.length > 0 && (
        <Card className="glass">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Son Satışlar</CardTitle>
            <Link to="/satis-faturalari"><Button variant="ghost" size="sm">Tümünü Gör</Button></Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fatura</TableHead><TableHead>Müşteri</TableHead>
                    <TableHead>Tarih</TableHead><TableHead>Durum</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesInvoices.slice(0, 6).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.no}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{s.party}</TableCell>
                      <TableCell className="text-muted-foreground">{s.date}</TableCell>
                      <TableCell><Badge variant={s.status === "Tahsil Edildi" ? "default" : "outline"}>{s.status}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{fmtTL(s.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {lowStock.length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Düşük Stok Uyarıları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lowStock.map((p) => (
                <div key={p.id} className="rounded-xl border bg-warning/5 p-3">
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.sku} · {p.category}</div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Stok</span>
                    <span className="font-semibold text-warning">{p.stock} / min {p.minStock}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
