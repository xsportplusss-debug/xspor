import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Store, Settings2, CheckCircle2, XCircle, RefreshCw, Download, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { getMarketplace, testMarketplaceConnection, fetchOrders } from "@/services/marketplaces";
import { fmtTL } from "@/lib/mock-data";

const TABS = [
  { id: "orders", label: "Siparişler" },
  { id: "products", label: "Ürünler" },
  { id: "sales", label: "Satışlar" },
  { id: "returns", label: "İadeler" },
  { id: "commissions", label: "Komisyonlar" },
  { id: "payments", label: "Ödemeler" },
] as const;

export function MarketplacePage({ id }: { id: string }) {
  const meta = getMarketplace(id);
  const name = meta?.name ?? id;
  const cfg = useStore((s) => s.marketplaceConfigs[id]);
  const setCfg = useStore((s) => s.setMarketplaceConfig);
  const addOrders = useStore((s) => s.addMarketplaceOrders);
  const orders = useStore((s) => s.marketplaceOrders.filter((o) => o.marketplace === id));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connected = !!cfg?.connected;

  const sums = orders.reduce(
    (a, o) => ({ amount: a.amount + o.amount, commission: a.commission + o.commission, net: a.net + o.net }),
    { amount: 0, commission: 0, net: 0 },
  );
  const returns = orders.filter((o) => o.status === "İade");

  const test = async () => {
    if (!cfg) return toast.error("Önce API bilgilerini kaydedin");
    setBusy(true); setError(null);
    try {
      const r = await testMarketplaceConnection(id, cfg);
      if (r.ok) { setCfg(id, { ...cfg, connected: true }); toast.success(r.message); }
      else { setCfg(id, { ...cfg, connected: false }); toast.error(r.message); }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bağlantı testi başarısız";
      setError(msg); toast.error(msg);
    } finally { setBusy(false); }
  };

  const pull = async () => {
    if (!cfg) return toast.error("Önce API bilgilerini kaydedin");
    setBusy(true); setError(null);
    try {
      const list = await fetchOrders(id, cfg);
      const added = addOrders(list.map((o) => ({ ...o, marketplace: id })));
      setCfg(id, { ...cfg, lastSync: new Date().toISOString() });
      if (added === 0) toast.info("Yeni veri bulunamadı");
      else toast.success(`${added} yeni sipariş eklendi`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Veriler alınamadı";
      setError(msg); toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={name}
        subtitle={connected ? "Bağlantı aktif — verileri çekebilirsiniz." : "Henüz bağlı değil. API bilgilerinizi girin."}
        actions={
          <>
            {connected ? (
              <Badge className="bg-success text-success-foreground gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Bağlı</Badge>
            ) : (
              <Badge variant="outline" className="gap-1"><XCircle className="h-3.5 w-3.5" /> Bağlı Değil</Badge>
            )}
            <Button size="sm" variant="outline" onClick={test} disabled={busy}>
              <RefreshCw className={`mr-1 h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Bağlantıyı Test Et
            </Button>
            <Button size="sm" onClick={pull} disabled={busy || !connected} className="gradient-primary text-primary-foreground">
              <Download className="mr-1 h-4 w-4" /> Verileri Çek
            </Button>
            <Link to="/pazaryerleri/ayarlar">
              <Button size="sm" variant="outline"><Settings2 className="mr-1 h-4 w-4" /> API Ayarları</Button>
            </Link>
          </>
        }
      />

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-2 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Summary label="Sipariş Adedi" value={String(orders.length)} />
        <Summary label="Toplam Ciro" value={fmtTL(sums.amount)} />
        <Summary label="Toplam Komisyon" value={`-${fmtTL(sums.commission)}`} tone="text-destructive" />
        <Summary label="Net Kazanç" value={fmtTL(sums.net)} tone="text-success" />
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="flex-wrap">
          {TABS.map((t) => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          {orders.length === 0 ? (
            <EmptyState icon={Store} title="Henüz veri bulunamadı" desc={connected ? "'Verileri Çek' butonuna basın." : "Önce API bağlantısını kurun."} />
          ) : (
            <Card className="glass"><CardContent className="p-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sipariş No</TableHead><TableHead>Tarih</TableHead>
                      <TableHead>Müşteri</TableHead><TableHead>Durum</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                      <TableHead className="text-right">Komisyon</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.orderNo}</TableCell>
                        <TableCell className="text-muted-foreground">{o.date}</TableCell>
                        <TableCell>{o.customer}</TableCell>
                        <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                        <TableCell className="text-right">{fmtTL(o.amount)}</TableCell>
                        <TableCell className="text-right text-destructive">-{fmtTL(o.commission)}</TableCell>
                        <TableCell className="text-right font-semibold text-success">{fmtTL(o.net)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-muted/40">
                      <TableCell colSpan={4} className="font-medium">Toplam</TableCell>
                      <TableCell className="text-right font-semibold">{fmtTL(sums.amount)}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">-{fmtTL(sums.commission)}</TableCell>
                      <TableCell className="text-right font-semibold text-success">{fmtTL(sums.net)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <EmptyState icon={Store} title="Henüz veri bulunamadı" desc="Pazaryeri ürün listesi API bağlantısı tanımlandığında burada görünecek." />
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          {orders.length === 0 ? (
            <EmptyState icon={Store} title="Henüz veri bulunamadı" desc="Satış özeti siparişler geldikçe hesaplanır." />
          ) : (
            <Card className="glass"><CardContent className="grid gap-3 p-4 sm:grid-cols-3">
              <Summary label="Brüt Satış" value={fmtTL(sums.amount)} />
              <Summary label="Komisyon" value={`-${fmtTL(sums.commission)}`} tone="text-destructive" />
              <Summary label="Net Satış" value={fmtTL(sums.net)} tone="text-success" />
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="returns" className="mt-4">
          {returns.length === 0 ? (
            <EmptyState icon={Store} title="Henüz veri bulunamadı" desc="İade edilen sipariş bulunmuyor." />
          ) : (
            <Card className="glass"><CardContent className="p-4">
              <Table>
                <TableHeader><TableRow><TableHead>Sipariş No</TableHead><TableHead>Tarih</TableHead><TableHead className="text-right">Tutar</TableHead></TableRow></TableHeader>
                <TableBody>
                  {returns.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.orderNo}</TableCell>
                      <TableCell>{o.date}</TableCell>
                      <TableCell className="text-right">{fmtTL(o.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="commissions" className="mt-4">
          {orders.length === 0 ? (
            <EmptyState icon={Store} title="Henüz veri bulunamadı" desc="Komisyon detayları siparişlerle birlikte gelir." />
          ) : (
            <Card className="glass"><CardContent className="p-4">
              <Table>
                <TableHeader><TableRow><TableHead>Sipariş No</TableHead><TableHead className="text-right">Tutar</TableHead><TableHead className="text-right">Komisyon</TableHead></TableRow></TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.orderNo}</TableCell>
                      <TableCell className="text-right">{fmtTL(o.amount)}</TableCell>
                      <TableCell className="text-right text-destructive">-{fmtTL(o.commission)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter><TableRow className="bg-muted/40">
                  <TableCell className="font-medium">Toplam</TableCell>
                  <TableCell className="text-right font-semibold">{fmtTL(sums.amount)}</TableCell>
                  <TableCell className="text-right font-semibold text-destructive">-{fmtTL(sums.commission)}</TableCell>
                </TableRow></TableFooter>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card className="glass">
            <CardHeader><CardTitle className="text-base">Ödemeler</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Summary label="Beklenen Ödeme (Net)" value={fmtTL(sums.net)} tone="text-success" />
              <Summary label="Son Senkron" value={cfg?.lastSync ? new Date(cfg.lastSync).toLocaleString("tr-TR") : "—"} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border bg-card/60 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
