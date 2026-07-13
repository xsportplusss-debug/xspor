import { createFileRoute } from "@tanstack/react-router";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Wallet, Landmark, TrendingUp, TrendingDown, Package, Clock,
  ArrowUpRight, CircleDollarSign, ShoppingBag, AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";
import { fmtTL, salesChart, incomeExpenseChart, salesInvoices, products } from "@/lib/mock-data";

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
  return (
    <div className="space-y-6">
      <PageHeader
        title="Hoş geldin, Ahmet 👋"
        subtitle="Bugünün özeti ve son 7 günün performansı."
        actions={
          <>
            <Button variant="outline" size="sm">Bu Ay</Button>
            <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
              <ArrowUpRight className="mr-1 h-4 w-4" /> Yeni Fatura
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Bugünkü Satış" value={fmtTL(24850.5)} icon={ShoppingBag} tone="primary" trend={12.4} />
        <StatCard label="Aylık Satış" value={fmtTL(742380)} icon={TrendingUp} tone="success" trend={8.2} />
        <StatCard label="Kasa Bakiyesi" value={fmtTL(45820.55)} icon={Wallet} tone="info" trend={-2.1} />
        <StatCard label="Banka Bakiyesi" value={fmtTL(922172.05)} icon={Landmark} tone="primary" trend={3.6} />
        <StatCard label="Toplam Alacak" value={fmtTL(456800)} icon={CircleDollarSign} tone="success" hint="12 açık cari" />
        <StatCard label="Toplam Borç" value={fmtTL(112000)} icon={TrendingDown} tone="destructive" hint="4 açık cari" />
        <StatCard label="Stok Değeri" value={fmtTL(1284500)} icon={Package} tone="info" hint="342 ürün" />
        <StatCard label="Bekleyen Tahsilat" value={fmtTL(87320)} icon={Clock} tone="warning" hint="3 fatura" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Satış / Alış</CardTitle>
              <p className="text-xs text-muted-foreground">Son 7 ay</p>
            </div>
            <Badge variant="secondary">₺ TL</Badge>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesChart}>
                <defs>
                  <linearGradient id="gSatis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gAlis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickFormatter={(v) => `${v / 1000}k`} tickLine={false} axisLine={false} className="text-xs" />
                <RTooltip
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }}
                  formatter={(v: number) => fmtTL(v)}
                />
                <Area type="monotone" dataKey="satis" name="Satış" stroke="var(--color-chart-1)" fill="url(#gSatis)" strokeWidth={2} />
                <Area type="monotone" dataKey="alis" name="Alış" stroke="var(--color-chart-2)" fill="url(#gAlis)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gelir / Gider</CardTitle>
            <p className="text-xs text-muted-foreground">Aylık karşılaştırma</p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeExpenseChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickFormatter={(v) => `${v / 1000}k`} tickLine={false} axisLine={false} className="text-xs" />
                <RTooltip
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }}
                  formatter={(v: number) => fmtTL(v)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="gelir" name="Gelir" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="gider" name="Gider" fill="var(--color-chart-5)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="glass lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Son Satışlar</CardTitle>
            <Button variant="ghost" size="sm">Tümünü Gör</Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fatura</TableHead>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesInvoices.slice(0, 6).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.no}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{s.party}</TableCell>
                      <TableCell className="text-muted-foreground">{s.date}</TableCell>
                      <TableCell>
                        <Badge variant={s.payment === "Tahsil Edildi" ? "default" : s.payment === "Kısmi" ? "secondary" : "outline"}>
                          {s.payment}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{fmtTL(s.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Yaklaşan Ödemeler</CardTitle>
            <p className="text-xs text-muted-foreground">Önümüzdeki 7 gün</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Global Elektronik", date: "14 Tem", amount: 68900 },
              { name: "Star Ambalaj", date: "16 Tem", amount: 12300 },
              { name: "Ofis Kirası", date: "18 Tem", amount: 25000 },
              { name: "Mercan Tekstil", date: "20 Tem", amount: 87600 },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border bg-muted/30 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.date}</div>
                </div>
                <div className="text-sm font-semibold">{fmtTL(p.amount)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Düşük Stok Uyarıları
            </CardTitle>
            <p className="text-xs text-muted-foreground">Minimum stok altına düşen ürünler</p>
          </div>
          <Button variant="ghost" size="sm">Sipariş Ver</Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.filter((p) => p.stock < p.minStock).map((p) => (
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
    </div>
  );
}
