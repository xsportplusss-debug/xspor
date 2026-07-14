import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { BarChart3, Landmark, Package, ShoppingBag, ShoppingCart, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { useMemo } from "react";
import { fmtTL } from "@/lib/mock-data";
import { useStore, bankBalance, cashBalance } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/raporlar")({
  head: () => ({
    meta: [
      { title: "Raporlar — Fintra" },
      { name: "description", content: "Satış, alış, gelir/gider ve stok özet raporları." },
    ],
  }),
  component: Page,
});

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function Page() {
  const salesInvoices = useStore((s) => s.salesInvoices);
  const purchaseInvoices = useStore((s) => s.purchaseInvoices);
  const banks = useStore((s) => s.banks);
  const cashes = useStore((s) => s.cashRegisters);
  const products = useStore((s) => s.products);
  const bankTx = useStore((s) => s.bankTx);
  const cashTx = useStore((s) => s.cashTx);

  const monthly = useMemo(() => {
    const map = new Map<string, { m: string; satis: number; alis: number }>();
    for (const s of salesInvoices) {
      const k = (s.date || "").slice(0, 7);
      if (!map.has(k)) map.set(k, { m: k, satis: 0, alis: 0 });
      map.get(k)!.satis += s.total;
    }
    for (const s of purchaseInvoices) {
      const k = (s.date || "").slice(0, 7);
      if (!map.has(k)) map.set(k, { m: k, satis: 0, alis: 0 });
      map.get(k)!.alis += s.total;
    }
    return [...map.values()].sort((a, b) => (a.m < b.m ? -1 : 1));
  }, [salesInvoices, purchaseInvoices]);

  const catDist = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const k = p.category || "Diğer";
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [products]);

  const totalSales = salesInvoices.reduce((a, b) => a + b.total, 0);
  const totalBuys = purchaseInvoices.reduce((a, b) => a + b.total, 0);
  const totalBank = banks.reduce((a, b) => a + bankBalance(b.id), 0);
  const totalCash = cashes.reduce((a, c) => a + cashBalance(c.id), 0);
  const income = [...bankTx, ...cashTx].filter((t) => t.amount > 0).reduce((a, b) => a + b.amount, 0);
  const expense = [...bankTx, ...cashTx].filter((t) => t.amount < 0).reduce((a, b) => a - b.amount, 0);

  const empty = monthly.length === 0 && catDist.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Raporlar" subtitle="Finansal ve operasyonel özetler." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Satış" value={fmtTL(totalSales)} icon={ShoppingBag} tone="primary" />
        <StatCard label="Alış" value={fmtTL(totalBuys)} icon={ShoppingCart} tone="info" />
        <StatCard label="Gelir" value={fmtTL(income)} icon={TrendingUp} tone="success" />
        <StatCard label="Gider" value={fmtTL(expense)} icon={TrendingDown} tone="destructive" />
        <StatCard label="Banka" value={fmtTL(totalBank)} icon={Landmark} tone="primary" />
        <StatCard label="Kasa" value={fmtTL(totalCash)} icon={Wallet} tone="info" />
        <StatCard label="Ürün" value={products.length.toString()} icon={Package} />
        <StatCard label="Net" value={fmtTL(income - expense)} icon={BarChart3} tone={income - expense >= 0 ? "success" : "destructive"} />
      </div>

      {empty ? (
        <EmptyState title="Rapor için veri yok" desc="Fatura, banka veya kasa hareketi girildiğinde grafikler oluşur." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {monthly.length > 0 && (
            <Card className="glass">
              <CardHeader><CardTitle className="text-base">Satış / Alış Trendi</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="m" tickLine={false} axisLine={false} className="text-xs" />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tickLine={false} axisLine={false} className="text-xs" />
                    <RTooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => fmtTL(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="satis" name="Satış" stroke="var(--color-chart-1)" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="alis" name="Alış" stroke="var(--color-chart-2)" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          {catDist.length > 0 && (
            <Card className="glass">
              <CardHeader><CardTitle className="text-base">Kategori Dağılımı</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={catDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2}>
                      {catDist.map((_, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <RTooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
