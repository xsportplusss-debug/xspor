import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Cloud, Download, RefreshCw, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { testConnection, fetchInvoices } from "@/services/e-invoice";

export const Route = createFileRoute("/e-fatura-entegrasyon")({
  head: () => ({
    meta: [
      { title: "E-Fatura Entegrasyonu — Fintra" },
      { name: "description", content: "GİB veya entegratör bağlantısı ile e-faturaları çekin." },
    ],
  }),
  component: Page,
});

function Page() {
  const cfg = useStore((s) => s.eInvoiceConfig);
  const lastSync = useStore((s) => s.eInvoiceLastSync);
  const setCfg = useStore((s) => s.setEInvoiceConfig);
  const setLastSync = useStore((s) => s.setEInvoiceLastSync);
  const bulkAddSales = useStore((s) => s.bulkAddSales);
  const bulkAddPurchase = useStore((s) => s.bulkAddPurchase);
  const salesInvoices = useStore((s) => s.salesInvoices);
  const purchaseInvoices = useStore((s) => s.purchaseInvoices);

  const [form, setForm] = useState(cfg ?? {
    apiUrl: "", username: "", password: "", companyCode: "", token: "", provider: "GİB",
  });
  const [testing, setTesting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [connected, setConnected] = useState<boolean>(!!cfg);

  const save = () => {
    setCfg(form);
    toast.success("E-Fatura bilgileri kaydedildi");
  };

  const test = async () => {
    setTesting(true);
    const r = await testConnection(form);
    setTesting(false);
    setConnected(r.ok);
    r.ok ? toast.success(r.message) : toast.error(r.message);
  };

  const pull = async () => {
    if (!connected) return toast.error("Önce bağlantıyı test edin");
    setFetching(true);
    const r = await fetchInvoices(form);
    setFetching(false);

    const existingSales = new Set(salesInvoices.map((i) => i.uuid || i.no));
    const existingPurchase = new Set(purchaseInvoices.map((i) => i.uuid || i.no));
    const newSales = r.sales.filter((i) => !existingSales.has(i.uuid || i.no));
    const newPurchase = r.purchase.filter((i) => !existingPurchase.has(i.uuid || i.no));

    if (newSales.length) bulkAddSales(newSales.map((i) => ({ ...i, source: "e-invoice" as const })));
    if (newPurchase.length) bulkAddPurchase(newPurchase.map((i) => ({ ...i, source: "e-invoice" as const })));

    const now = new Date().toISOString();
    setLastSync(now);

    const total = newSales.length + newPurchase.length;
    if (total === 0) {
      toast.info("Yeni fatura bulunamadı (mock — gerçek API henüz bağlı değil)");
    } else {
      toast.success(`${total} yeni fatura eklendi (${newSales.length} satış, ${newPurchase.length} alış)`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="E-Fatura Entegrasyonu"
        subtitle="GİB veya entegratör bağlantınızı yapılandırın, faturaları otomatik çekin."
        actions={
          connected ? (
            <Badge className="bg-success text-success-foreground gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> E-Fatura Bağlı</Badge>
          ) : (
            <Badge variant="outline" className="gap-1"><XCircle className="h-3.5 w-3.5" /> Bağlı Değil</Badge>
          )
        }
      />

      <Card className="glass">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Cloud className="h-4 w-4" /> Bağlantı Bilgileri</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>API URL</Label><Input value={form.apiUrl} onChange={(e) => setForm({ ...form, apiUrl: e.target.value })} placeholder="https://api.foriba.com/..." /></div>
            <div><Label>Entegratör / GİB</Label><Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="GİB / Foriba / Nes / Uyumsoft" /></div>
            <div><Label>Kullanıcı Adı</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
            <div><Label>Şifre</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div><Label>Firma Kodu</Label><Input value={form.companyCode} onChange={(e) => setForm({ ...form, companyCode: e.target.value })} /></div>
            <div><Label>Token</Label><Input value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} /></div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" onClick={save}>Kaydet</Button>
            <Button variant="outline" onClick={test} disabled={testing}>
              <RefreshCw className={`mr-1 h-4 w-4 ${testing ? "animate-spin" : ""}`} /> Bağlantıyı Test Et
            </Button>
            <Button onClick={pull} disabled={fetching || !connected} className="gradient-primary text-primary-foreground">
              <Download className={`mr-1 h-4 w-4 ${fetching ? "animate-pulse" : ""}`} /> Faturaları Çek
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Son senkronizasyon: <span className="font-medium text-foreground">{lastSync ? new Date(lastSync).toLocaleString("tr-TR") : "—"}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Not: Gerçek entegratör API bağlantısı için servis katmanı hazırdır; endpoint tanımlandığında otomatik çalışır.
            Aynı UUID / fatura numarası ikinci kez eklenmez.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
