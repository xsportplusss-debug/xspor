import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { notifications } from "@/lib/mock-data";

export const Route = createFileRoute("/bildirimler")({
  head: () => ({
    meta: [
      { title: "Bildirimler — Fintra" },
      { name: "description", content: "Sistem bildirimleri, uyarılar ve hatırlatmalar." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Bildirimler" subtitle="Son sistem bildirimleri." />
      <div className="space-y-3">
        {notifications.map((n) => {
          const Icon = n.type === "success" ? CheckCircle2 : n.type === "warning" ? AlertTriangle : Info;
          const tone = n.type === "success" ? "text-success bg-success/10" : n.type === "warning" ? "text-warning bg-warning/10" : "text-info bg-info/10";
          return (
            <Card key={n.id} className="glass">
              <CardContent className="flex items-start gap-3 p-4">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate font-semibold">{n.title}</div>
                    <div className="shrink-0 text-xs text-muted-foreground">{n.time}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{n.desc}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
