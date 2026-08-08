import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Settings2, Store, XCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { MARKETPLACES } from "@/services/marketplaces";

export const Route = createFileRoute("/pazaryerleri/")({
  head: () => ({
    meta: [
      { title: "Pazaryerleri — Fintra" },
      { name: "description", content: "Trendyol, Hepsiburada, N11 ve diğer pazaryeri entegrasyonlarını yönetin." },
      { property: "og:title", content: "Pazaryerleri — Fintra" },
      { property: "og:description", content: "Pazaryeri bağlantılarınızı görüntüleyin ve yönetin." },
    ],
  }),
  component: Page,
});

function Page() {
  const configs = useStore((s) => s.marketplaceConfigs);
  const orders = useStore((s) => s.marketplaceOrders);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pazaryerleri"
        subtitle="Bağlantı durumlarını görün, detay sayfasına geçin."
        actions={
          <Link to="/pazaryerleri/ayarlar">
            <Button size="sm" variant="outline"><Settings2 className="mr-1 h-4 w-4" /> API Ayarları</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MARKETPLACES.map((m) => {
          const cfg = configs[m.id];
          const count = orders.filter((o) => o.marketplace === m.id).length;
          return (
            <Card key={m.id} className="glass overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: m.color }} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ backgroundColor: m.color }}>
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.website}</div>
                    </div>
                  </div>
                  {cfg?.connected ? (
                    <Badge className="bg-success text-success-foreground gap-1"><CheckCircle2 className="h-3 w-3" /> Bağlı</Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" /> Bağlı Değil</Badge>
                  )}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {count} sipariş{cfg?.lastSync ? ` • Son senkron: ${new Date(cfg.lastSync).toLocaleString("tr-TR")}` : ""}
                </div>
                <Link to="/pazaryerleri/$id" params={{ id: m.id }} className="mt-4 block">
                  <Button size="sm" className="w-full gradient-primary text-primary-foreground">Görüntüle / Yönet</Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
