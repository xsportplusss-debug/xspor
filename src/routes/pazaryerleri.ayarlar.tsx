import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Download, RefreshCw, Store, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useStore, type MarketplaceConfig } from "@/lib/store";
import { MARKETPLACES, testMarketplaceConnection, fetchOrders } from "@/services/marketplaces";

export const Route = createFileRoute("/pazaryerleri/ayarlar")({
  head: () => ({
    meta: [
      { title: "Pazaryeri Ayarları — Fintra" },
      { name: "description", content: "Trendyol, Hepsiburada, N11 ve diğer pazaryeri API bağlantıları." },
    ],
  }),
  component: Page,
});

const empty = (): MarketplaceConfig => ({
  apiUrl: "", apiKey: "", apiSecret: "", merchantId: "", token: "", connected: false,
});

function Page() {
  const configs = useStore((s) => s.marketplaceConfigs);
  const setCfg = useStore((s) => s.setMarketplaceConfig);
  const addOrders = useStore((s) => s.addMarketplaceOrders);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pazaryeri Ayarları"
        subtitle="Her pazaryeri için API bağlantısını yapılandırın. Bağlantı sonrası siparişler otomatik çekilir."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {MARKETPLACES.map((m) => (
          <MarketplaceCard
            key={m.id}
            id={m.id}
            name={m.name}
            color={m.color}
            website={m.website}
            initial={configs[m.id] ?? empty()}
            onSave={(c) => { setCfg(m.id, c); toast.success(`${m.name} bilgileri kaydedildi`); }}
            onPull={async (c) => {
              const list = await fetchOrders(m.id, c);
              const added = addOrders(list.map((o) => ({ ...o, marketplace: m.id })));
              const now = new Date().toISOString();
              setCfg(m.id, { ...c, lastSync: now });
              if (added === 0) toast.info(`${m.name}: Yeni sipariş yok (mock — gerçek API henüz bağlı değil)`);
              else toast.success(`${m.name}: ${added} yeni sipariş eklendi`);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MarketplaceCard({
  id, name, color, website, initial, onSave, onPull,
}: {
  id: string; name: string; color: string; website: string;
  initial: MarketplaceConfig;
  onSave: (c: MarketplaceConfig) => void;
  onPull: (c: MarketplaceConfig) => Promise<void>;
}) {
  const [c, setC] = useState<MarketplaceConfig>(initial);
  const [busy, setBusy] = useState(false);

  const test = async () => {
    setBusy(true);
    const r = await testMarketplaceConnection(id, c);
    setBusy(false);
    if (r.ok) { const next = { ...c, connected: true }; setC(next); onSave(next); toast.success(r.message); }
    else { toast.error(r.message); }
  };

  const pull = async () => {
    setBusy(true); await onPull(c); setBusy(false);
  };

  return (
    <Card className="glass overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: color }} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ backgroundColor: color }}>
              <Store className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">{name}</div>
              <div className="text-xs text-muted-foreground">{website}</div>
            </div>
          </div>
          {c.connected ? (
            <Badge className="bg-success text-success-foreground gap-1"><CheckCircle2 className="h-3 w-3" /> Bağlı</Badge>
          ) : (
            <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" /> Bağlı Değil</Badge>
          )}
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <div><Label className="text-xs">API URL</Label><Input className="h-8" value={c.apiUrl} onChange={(e) => setC({ ...c, apiUrl: e.target.value })} /></div>
          <div><Label className="text-xs">Merchant ID</Label><Input className="h-8" value={c.merchantId} onChange={(e) => setC({ ...c, merchantId: e.target.value })} /></div>
          <div><Label className="text-xs">API Key</Label><Input className="h-8" value={c.apiKey} onChange={(e) => setC({ ...c, apiKey: e.target.value })} /></div>
          <div><Label className="text-xs">API Secret</Label><Input className="h-8" type="password" value={c.apiSecret} onChange={(e) => setC({ ...c, apiSecret: e.target.value })} /></div>
          <div className="md:col-span-2"><Label className="text-xs">Token</Label><Input className="h-8" value={c.token} onChange={(e) => setC({ ...c, token: e.target.value })} /></div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onSave(c)}>Kaydet</Button>
          <Button size="sm" variant="outline" onClick={test} disabled={busy}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Test Et
          </Button>
          <Button size="sm" onClick={pull} disabled={busy || !c.connected} className="gradient-primary text-primary-foreground">
            <Download className="mr-1 h-3.5 w-3.5" /> Siparişleri Çek
          </Button>
        </div>
        {c.lastSync && (
          <p className="mt-2 text-[11px] text-muted-foreground">Son senkron: {new Date(c.lastSync).toLocaleString("tr-TR")}</p>
        )}
      </CardContent>
    </Card>
  );
}
