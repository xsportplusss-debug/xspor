import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/takvim")({
  head: () => ({
    meta: [
      { title: "Takvim — Fintra" },
      { name: "description", content: "Vade tarihleri, ödemeler ve hatırlatıcılar." },
    ],
  }),
  component: Page,
});

const monthNames = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const events: Record<number, { title: string; type: "gelir" | "gider" | "fatura" }[]> = {
  3: [{ title: "KDV Beyanı", type: "fatura" }],
  8: [{ title: "Global Elektronik ödemesi", type: "gider" }],
  12: [{ title: "Yıldız Tekstil tahsilat", type: "gelir" }],
  15: [{ title: "Ofis kirası", type: "gider" }],
  20: [{ title: "Mercan Tekstil ödemesi", type: "gider" }],
  25: [{ title: "SGK ödemesi", type: "gider" }],
  28: [{ title: "Muhtasar Beyan", type: "fatura" }],
};

function Page() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const first = new Date(y, m, 1).getDay(); // 0 Sun
  const offset = (first + 6) % 7; // Monday start
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  return (
    <div className="space-y-6">
      <PageHeader title="Takvim" subtitle={`${monthNames[m]} ${y}`} />
      <Card className="glass">
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
            {["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              const isToday = d === today.getDate();
              const evs = d ? events[d] ?? [] : [];
              return (
                <div key={i} className={`min-h-24 rounded-lg border p-2 ${isToday ? "bg-primary/5 border-primary/30" : "bg-card"}`}>
                  {d && (
                    <>
                      <div className={`text-xs font-semibold ${isToday ? "text-primary" : ""}`}>{d}</div>
                      <div className="mt-1 space-y-1">
                        {evs.map((e, j) => (
                          <div key={j} className={`truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                            e.type === "gelir" ? "bg-success/15 text-success" :
                            e.type === "gider" ? "bg-destructive/15 text-destructive" :
                            "bg-info/15 text-info"
                          }`}>{e.title}</div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Badge variant="secondary" className="bg-success/15 text-success">Gelir</Badge>
            <Badge variant="secondary" className="bg-destructive/15 text-destructive">Gider</Badge>
            <Badge variant="secondary" className="bg-info/15 text-info">Fatura / Beyan</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
