import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useCompany } from "@/lib/company";

export const Route = createFileRoute("/firma-ayarlari")({
  head: () => ({
    meta: [
      { title: "Firma Ayarları — Fintra" },
      { name: "description", content: "Firma bilgileri, iletişim ve tercihler." },
    ],
  }),
  component: Page,
});

function Page() {
  const c = useCompany();
  return (
    <div className="space-y-6">
      <PageHeader title="Firma Ayarları" subtitle="Fiyat teklifi ve belgelerde bu bilgiler kullanılır." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Firma Bilgileri</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-4">
              {c.logoUrl && <img src={c.logoUrl} alt="logo" className="h-16 w-16 rounded-lg object-contain border bg-white p-1" />}
              <div className="flex-1 grid gap-2"><Label>Logo URL</Label><Input value={c.logoUrl} onChange={(e) => c.set({ logoUrl: e.target.value })} /></div>
            </div>
            <div className="grid gap-2"><Label>Ünvan</Label><Input value={c.name} onChange={(e) => c.set({ name: e.target.value })} /></div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Slogan / Faaliyet</Label><Input value={c.tagline} onChange={(e) => c.set({ tagline: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Yetkili / Sahibi</Label><Input value={c.owner} onChange={(e) => c.set({ owner: e.target.value })} /></div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Vergi Dairesi</Label><Input value={c.taxOffice} onChange={(e) => c.set({ taxOffice: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Vergi No</Label><Input value={c.taxNo} onChange={(e) => c.set({ taxNo: e.target.value })} /></div>
            </div>
            <div className="grid gap-2"><Label>Adres</Label><Input value={c.address} onChange={(e) => c.set({ address: e.target.value })} /></div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Telefon</Label><Input value={c.phone} onChange={(e) => c.set({ phone: e.target.value })} /></div>
              <div className="grid gap-2"><Label>E-posta</Label><Input value={c.email} onChange={(e) => c.set({ email: e.target.value })} /></div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Web</Label><Input value={c.web} onChange={(e) => c.set({ web: e.target.value })} /></div>
              <div className="grid gap-2"><Label>KEP</Label><Input value={c.kep} onChange={(e) => c.set({ kep: e.target.value })} /></div>
            </div>
            <Button onClick={() => toast.success("Firma bilgileri kaydedildi")} className="gradient-primary text-primary-foreground shadow-elegant">Kaydet</Button>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Tercihler</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "E-posta bildirimleri", desc: "Yeni fatura ve tahsilatlarda mail al" },
              { label: "SMS bildirimleri", desc: "Kritik uyarılar için SMS gönderilsin" },
              { label: "Otomatik yedekleme", desc: "Tüm veriler günlük yedeklensin" },
              { label: "İki adımlı doğrulama", desc: "Yönetici hesabı için 2FA aktif olsun" },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </div>
                <Switch defaultChecked={i < 2} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
