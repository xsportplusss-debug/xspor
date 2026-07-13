import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Landmark, Package, ShoppingBag, ShoppingCart, TrendingUp, Users, Wallet } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { fmtTL, salesChart, categories } from "@/lib/mock-data";

export const Route = createFileRoute("/raporlar")({
  head: () => ({
    meta: [
      { title: "Raporlar — Fintra" },
      { name: "description", content: "Satış, alış, kar/zarar ve KDV raporları." },
    ],
  }),
  component: Page,
});

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Raporlar"
        subtitle="Finansal ve operasyonel raporlar."
        actions={
          <Tabs defaultValue="aylik">
            <TabsList>
              <TabsTrigger value="gunluk">Günlük</TabsTrigger>
              <TabsTrigger value="haftalik">Haftalık</TabsTrigger>
              <TabsTrigger value="aylik">Aylık</TabsTrigger>
              <TabsTrigger value="yillik">Yıllık</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Satış" value={fmtTL(1358000)} icon={ShoppingBag} tone="primary" trend={12.4} />
        <StatCard label="Alış" value={fmtTL(942000)} icon={ShoppingCart} tone="info" trend={5.8} />
        <StatCard label="Kar / Zarar" value={fmtTL(416000)} icon={TrendingUp} tone="success" trend={22.1} />
        <StatCard label="KDV" value={fmtTL(83200)} icon={BarChart3} tone="warning" />
        <StatCard label="Kasa" value={fmtTL(66970)} icon={Wallet} tone="primary" />
        <StatCard label="Banka" value={fmtTL(922172)} icon={Landmark} tone="info" />
        <StatCard label="Cari Alacak" value={fmtTL(456800)} icon={Users} tone="success" />
        <StatCard label="Stok" value={fmtTL(1284500)} icon={Package} tone="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Satış Trendi</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickFormatter={(v) => `${v / 1000}k`} tickLine={false} axisLine={false} className="text-xs" />
                <RTooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => fmtTL(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="satis" name="Satış" stroke="var(--color-chart-1)" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="alis" name="Alış" stroke="var(--color-chart-2)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Kategori Dağılımı</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categories} dataKey="products" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2}>
                  {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <RTooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
