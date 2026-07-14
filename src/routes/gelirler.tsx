import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Wallet, Landmark } from "lucide-react";
import { useMemo, useState } from "react";
import { fmtTL } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/gelirler")({
  head: () => ({
    meta: [
      { title: "Gelirler — Fintra" },
      { name: "description", content: "Banka ve kasa hareketlerinden ayrıştırılmış gelir kalemleri." },
    ],
  }),
  component: Page,
});

function Page() {
  const banks = useStore((s) => s.banks);
  const cashes = useStore((s) => s.cashRegisters);
  const bankTx = useStore((s) => s.bankTx);
  const cashTx = useStore((s) => s.cashTx);
  const [source, setSource] = useState("all");
  const [q, setQ] = useState("");

  const all = useMemo(() => {
    const b = bankTx.filter((t) => t.amount > 0).map((t) => ({
      id: t.id, date: t.date, source: banks.find((b) => b.id === t.bankId)?.name ?? "Banka",
      kind: "Banka" as const, description: t.description, category: t.category || "—", amount: t.amount,
    }));
    const c = cashTx.filter((t) => t.amount > 0).map((t) => ({
      id: t.id, date: t.date, source: cashes.find((c) => c.id === t.cashId)?.name ?? "Kasa",
      kind: "Kasa" as const, description: t.description, category: t.category || "—", amount: t.amount,
    }));
    return [...b, ...c].sort((x, y) => (x.date < y.date ? 1 : -1));
  }, [bankTx, cashTx, banks, cashes]);

  const filtered = all.filter((r) =>
    (source === "all" || r.kind === source) &&
    (r.description.toLowerCase().includes(q.toLowerCase()) || r.category.toLowerCase().includes(q.toLowerCase())),
  );

  const totalBank = all.filter((r) => r.kind === "Banka").reduce((a, b) => a + b.amount, 0);
  const totalCash = all.filter((r) => r.kind === "Kasa").reduce((a, b) => a + b.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Gelirler" subtitle="Tüm banka ve kasa gelirleri tek tabloda." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Toplam Gelir" value={fmtTL(totalBank + totalCash)} icon={TrendingUp} tone="success" />
        <StatCard label="Banka Girişleri" value={fmtTL(totalBank)} icon={Landmark} tone="primary" />
        <StatCard label="Kasa Girişleri" value={fmtTL(totalCash)} icon={Wallet} tone="info" />
      </div>

      {all.length === 0 ? (
        <EmptyState title="Henüz gelir yok" desc="Banka veya Kasa hareketleri girildiğinde otomatik listelenir." />
      ) : (
        <Card className="glass"><CardContent className="p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara..." className="max-w-xs" />
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="Banka">Banka</SelectItem>
                <SelectItem value="Kasa">Kasa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead><TableHead>Kaynak</TableHead><TableHead>Açıklama</TableHead>
                  <TableHead>Kategori</TableHead><TableHead className="text-right">Tutar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.kind + r.id}>
                    <TableCell className="text-muted-foreground">{r.date}</TableCell>
                    <TableCell><Badge variant="secondary">{r.kind}</Badge> <span className="ml-1 text-xs text-muted-foreground">{r.source}</span></TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell className="text-muted-foreground">{r.category}</TableCell>
                    <TableCell className="text-right font-semibold text-success">{fmtTL(r.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
