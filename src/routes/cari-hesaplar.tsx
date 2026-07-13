import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, LayoutGrid, List } from "lucide-react";
import { useState } from "react";
import { cariList, fmtTL } from "@/lib/mock-data";

export const Route = createFileRoute("/cari-hesaplar")({
  head: () => ({
    meta: [
      { title: "Cari Hesaplar — Fintra" },
      { name: "description", content: "Müşteri ve tedarikçi cari hesap bakiyelerini yönetin." },
    ],
  }),
  component: Page,
});

function Page() {
  const [q, setQ] = useState("");
  const filtered = cariList.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()) || c.code.includes(q));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cari Hesaplar"
        subtitle="Müşteri ve tedarikçi bakiyeleri."
        actions={<Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant"><Plus className="mr-1 h-4 w-4" /> Yeni Cari</Button>}
      />

      <Tabs defaultValue="cards">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari ara..." className="pl-9" />
          </div>
          <TabsList>
            <TabsTrigger value="cards"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="table"><List className="h-4 w-4" /></TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="cards" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Card key={c.id} className="glass transition-transform hover:-translate-y-0.5 hover:shadow-elegant">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {c.title.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate font-semibold">{c.title}</div>
                        <Badge variant="outline" className="shrink-0 text-[10px]">{c.type}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{c.code} · {c.phone}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Bakiye</div>
                      <div className={`text-lg font-bold ${c.balance >= 0 ? "text-success" : "text-destructive"}`}>
                        {fmtTL(Math.abs(c.balance))}
                      </div>
                    </div>
                    <Badge variant={c.status === "Aktif" ? "default" : "secondary"}>{c.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <Card className="glass">
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kod</TableHead>
                      <TableHead>Ünvan</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Vergi No</TableHead>
                      <TableHead>Tip</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right">Bakiye</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.code}</TableCell>
                        <TableCell>{c.title}</TableCell>
                        <TableCell className="text-muted-foreground">{c.phone}</TableCell>
                        <TableCell className="text-muted-foreground">{c.taxNo}</TableCell>
                        <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                        <TableCell><Badge variant={c.status === "Aktif" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                        <TableCell className={`text-right font-semibold ${c.balance >= 0 ? "text-success" : "text-destructive"}`}>{fmtTL(c.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
