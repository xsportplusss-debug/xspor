import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fmtTL } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/cari-hesaplar")({
  head: () => ({
    meta: [
      { title: "Cari Hesaplar — Fintra" },
      { name: "description", content: "Müşteri ve tedarikçi cari hesaplarını yönetin." },
    ],
  }),
  component: Page,
});

function Page() {
  const list = useStore((s) => s.cariList);
  const addCari = useStore((s) => s.addCari);
  const removeCari = useStore((s) => s.removeCari);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ code: string; title: string; phone: string; taxNo: string; balance: number; type: "Müşteri" | "Tedarikçi" }>({
    code: "", title: "", phone: "", taxNo: "", balance: 0, type: "Müşteri",
  });

  const filtered = list.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()) || c.code.includes(q));

  const save = () => {
    if (!form.title) return toast.error("Ünvan girin");
    addCari({ ...form, status: "Aktif" });
    setOpen(false);
    setForm({ code: "", title: "", phone: "", taxNo: "", balance: 0, type: "Müşteri" });
    toast.success("Cari eklendi");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cari Hesaplar"
        subtitle={`${list.length} kayıt`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
                <Plus className="mr-1 h-4 w-4" /> Yeni Cari
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Yeni Cari</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Kod</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                  <div>
                    <Label>Tip</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Müşteri">Müşteri</SelectItem>
                        <SelectItem value="Tedarikçi">Tedarikçi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Ünvan</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><Label>Vergi No</Label><Input value={form.taxNo} onChange={(e) => setForm({ ...form, taxNo: e.target.value })} /></div>
                </div>
                <div><Label>Açılış Bakiyesi</Label><Input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: +e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                <Button onClick={save} className="gradient-primary text-primary-foreground">Kaydet</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {list.length === 0 ? (
        <EmptyState title="Henüz cari yok" desc="Yeni cari eklemek için üstteki butonu kullanın." />
      ) : (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="mb-4 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari ara..." className="pl-9 max-w-md" />
            </div>
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
                    <TableHead className="w-10"></TableHead>
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
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => { removeCari(c.id); toast.success("Silindi"); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
