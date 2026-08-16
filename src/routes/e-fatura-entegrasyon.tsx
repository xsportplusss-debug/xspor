import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Cloud, Loader2, RefreshCw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getEdmSettings, saveEdmSettings, testEdmConnection, type EdmSettingsForm } from "@/lib/edm.functions";
import { EdmInvoicePanel } from "@/components/edm-invoice-panel";

export const Route = createFileRoute("/e-fatura-entegrasyon")({
  head: () => ({
    meta: [
      { title: "EDM e-Fatura Entegrasyonu — Fintra" },
      { name: "description", content: "EDM Bilişim Web Service ile gelen ve giden e-faturalarınızı otomatik çekin." },
      { property: "og:title", content: "EDM e-Fatura Entegrasyonu — Fintra" },
      { property: "og:description", content: "EDM Bilişim Web Service ile e-fatura senkronizasyonu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const empty: EdmSettingsForm = {
  api_url: "",
  environment: "TEST",
  username: "",
  password: "",
  vkn_tckn: "",
  company_name: "",
  gb_label: "",
  pk_label: "",
  company_code: "",
  token: "",
};

function Page() {
  const qc = useQueryClient();
  const get = useServerFn(getEdmSettings);
  const save = useServerFn(saveEdmSettings);
  const test = useServerFn(testEdmConnection);

  const settings = useQuery({ queryKey: ["edm-settings"], queryFn: () => get() });
  const [form, setForm] = useState<EdmSettingsForm>(empty);

  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    setForm({
      api_url: s.api_url,
      environment: s.environment,
      username: s.username,
      password: "",
      vkn_tckn: s.vkn_tckn ?? "",
      company_name: s.company_name ?? "",
      gb_label: s.gb_label ?? "",
      pk_label: s.pk_label ?? "",
      company_code: s.company_code ?? "",
      token: "",
    });
  }, [settings.data]);

  const saveMut = useMutation({
    mutationFn: () => save({ data: form }),
    onSuccess: () => {
      toast.success("EDM bağlantı bilgileri kaydedildi");
      setForm((f) => ({ ...f, password: "" }));
      void qc.invalidateQueries({ queryKey: ["edm-settings"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Kaydedilemedi"),
  });

  const testMut = useMutation({
    mutationFn: () => test(),
    onSuccess: (r) => {
      r.ok ? toast.success(r.message) : toast.error(r.message);
      void qc.invalidateQueries({ queryKey: ["edm-settings"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Bağlantı testi başarısız"),
  });

  const connected = settings.data?.connection_status === "connected";
  const set = (k: keyof EdmSettingsForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="EDM e-Fatura Entegrasyonu"
        subtitle="EDM Bilişim Web Service bağlantınızı yapılandırın, gelen ve giden faturaları otomatik çekin."
        actions={
          connected ? (
            <Badge className="bg-success text-success-foreground gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Bağlı</Badge>
          ) : (
            <Badge variant="outline" className="gap-1"><XCircle className="h-3.5 w-3.5" /> Bağlı Değil</Badge>
          )
        }
      />

      <Card className="glass">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Cloud className="h-4 w-4" /> Bağlantı Bilgileri</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Web Service URL</Label>
              <Input value={form.api_url} onChange={(e) => set("api_url", e.target.value)} placeholder="https://efaturaws.edmbilisim.com.tr/EFaturaEDM/EFaturaEDM.svc" />
            </div>
            <div>
              <Label>Ortam</Label>
              <Select value={form.environment} onValueChange={(v) => set("environment", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEST">Test</SelectItem>
                  <SelectItem value="PROD">Canlı (Prod)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Kullanıcı Adı</Label><Input value={form.username} onChange={(e) => set("username", e.target.value)} /></div>
            <div>
              <Label>Şifre {settings.data?.has_password && <span className="text-xs text-muted-foreground">(kayıtlı — değiştirmek için doldurun)</span>}</Label>
              <Input type="password" value={form.password ?? ""} onChange={(e) => set("password", e.target.value)} placeholder={settings.data?.has_password ? "••••••••" : ""} />
            </div>
            <div><Label>VKN / TCKN</Label><Input value={form.vkn_tckn ?? ""} onChange={(e) => set("vkn_tckn", e.target.value)} /></div>
            <div><Label>Firma Ünvanı</Label><Input value={form.company_name ?? ""} onChange={(e) => set("company_name", e.target.value)} /></div>
            <div><Label>GB Etiketi</Label><Input value={form.gb_label ?? ""} onChange={(e) => set("gb_label", e.target.value)} placeholder="urn:mail:defaultgb@..." /></div>
            <div><Label>PK Etiketi</Label><Input value={form.pk_label ?? ""} onChange={(e) => set("pk_label", e.target.value)} placeholder="urn:mail:defaultpk@..." /></div>
            <div><Label>Firma Kodu</Label><Input value={form.company_code ?? ""} onChange={(e) => set("company_code", e.target.value)} /></div>
            <div><Label>Token (opsiyonel)</Label><Input value={form.token ?? ""} onChange={(e) => set("token", e.target.value)} /></div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Kaydet
            </Button>
            <Button variant="outline" onClick={() => testMut.mutate()} disabled={testMut.isPending}>
              <RefreshCw className={`mr-1 h-4 w-4 ${testMut.isPending ? "animate-spin" : ""}`} /> Bağlantıyı Test Et
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Son senkronizasyon:{" "}
            <span className="font-medium text-foreground">
              {settings.data?.last_sync_at ? new Date(settings.data.last_sync_at).toLocaleString("tr-TR") : "—"}
            </span>
          </p>
          {settings.data?.last_error && (
            <p className="text-xs text-destructive">Son hata: {settings.data.last_error}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Şifreniz sunucuda şifrelenerek saklanır ve tarayıcıya hiçbir zaman gönderilmez. Oturum (SESSION_ID) süresi
            dolduğunda otomatik olarak yeniden giriş yapılır. Aynı fatura UUID'si ikinci kez kaydedilmez.
          </p>
        </CardContent>
      </Card>

      <EdmInvoicePanel direction="IN" />
      <EdmInvoicePanel direction="OUT" />
    </div>
  );
}
