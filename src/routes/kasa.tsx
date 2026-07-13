import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cashRegisters, fmt } from "@/lib/mock-data";

export const Route = createFileRoute("/kasa")({
  head: () => ({
    meta: [
      { title: "Kasa — Fintra" },
      { name: "description", content: "TL, USD ve EUR kasa bakiyeleriniz." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Kasa" subtitle="Nakit kasa bakiyeleri." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cashRegisters.map((c) => (
          <Card key={c.id} className="glass">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">{c.currency}</span>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">Güncel Bakiye</div>
              <div className="text-2xl font-bold tracking-tight">{fmt(c.balance, c.currency === "TL" ? "TRY" : c.currency)}</div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm"><ArrowDownLeft className="mr-1 h-4 w-4 text-success" /> Giriş</Button>
                <Button variant="outline" size="sm"><ArrowUpRight className="mr-1 h-4 w-4 text-destructive" /> Çıkış</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
