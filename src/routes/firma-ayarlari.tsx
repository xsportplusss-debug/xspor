import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/firma-ayarlari")({
  head: () => ({
    meta: [
      { title: "Firma Ayarları — Fintra" },
      { name: "description", content: "Firma bilgileri, vergi dairesi ve tercihleri." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Firma Ayarları" subtitle="Firma bilgileri ve tercihler." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Firma Bilgileri</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2"><Label>Ünvan</Label><Input defaultValue="Fintra Yazılım A.Ş." /></div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Vergi Dairesi</Label><Input defaultValue="Büyük Mükellefler" /></div>
              <div className="grid gap-2"><Label>Vergi No</Label><Input defaultValue="1234567890" /></div>
            </div>
            <div className="grid gap-2"><Label>Adres</Label><Input defaultValue="Levent Mah. Büyükdere Cad. No:1, İstanbul" /></div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Telefon</Label><Input defaultValue="0212 555 00 00" /></div>
              <div className="grid gap-2"><Label>E-posta</Label><Input defaultValue="info@fintra.com" /></div>
            </div>
            <Button onClick={() => toast.success("Firma bilgileri güncellendi")} className="gradient-primary text-primary-foreground shadow-elegant">Kaydet</Button>
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
