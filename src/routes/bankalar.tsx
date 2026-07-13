import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDownLeft, ArrowUpRight, Building2, Landmark, Plus, Send } from "lucide-react";
import { banks, fmtTL } from "@/lib/mock-data";

export const Route = createFileRoute("/bankalar")({
  head: () => ({
    meta: [
      { title: "Bankalar — Fintra" },
      { name: "description", content: "Banka hesapları, bakiyeler ve son hareketler." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bankalar"
        subtitle="Tüm banka hesaplarınız tek yerde."
        actions={<Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant"><Plus className="mr-1 h-4 w-4" /> Yeni Hesap</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {banks.map((b) => (
          <Card key={b.id} className="glass overflow-hidden">
            <div className="h-1.5" style={{ backgroundColor: b.color }} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-xl text-white font-bold" style={{ backgroundColor: b.color }}>
                  <Landmark className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{b.short}</span>
              </div>
              <div className="mt-3 text-base font-semibold">{b.name}</div>
              <div className="mt-1 text-xs font-mono text-muted-foreground truncate">{b.iban}</div>
              <div className="mt-4 text-xs text-muted-foreground">Güncel Bakiye</div>
              <div className="text-2xl font-bold tracking-tight">{fmtTL(b.balance)}</div>
              <div className="mt-4 grid grid-cols-4 gap-1">
                <Button variant="outline" size="sm" className="text-[11px]"><ArrowDownLeft className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" className="text-[11px]"><ArrowUpRight className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" className="text-[11px]"><Send className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" className="text-[11px]"><Building2 className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
