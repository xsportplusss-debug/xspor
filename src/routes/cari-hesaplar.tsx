import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fmtTL, type Cari } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";
import { useSelection } from "@/hooks/use-selection";

export const Route = createFileRoute("/cari-hesaplar")({
  head: () => ({
    meta: [
      { title: "Cari Hesaplar — Fintra" },
      { name: "description", content: "Müşteri ve tedarikçi cari hesaplarını yönetin." },
    ],
  }),
  component: Page,
});

const emptyForm = () => ({ code: "", title: "", phone: "", taxNo: "", balance: 0, type: "Müşteri" as const, status: "Aktif" as const });

function Page() {
  const list = useStore((s) => s.cariList);
  const addCari = useStore((s) => s.addCari);
  const updateCari = useStore((s) => s.updateCari);
  const removeCari = useStore((s) => s.removeCari);
  const bulkRemove = useStore((s) => s.bulkRemoveCari);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Cari, "id">>(emptyForm());
  const [editing, setEditing] = useState<Cari | null>(null);

  const filtered = list.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()) || c.code.includes(q));
  const sel = useSelection(filtered);

  const save = () => {
    if (!form.title) return toast.error("Ünvan girin");
    addCari(form);
    setOpen(false);
    setForm(emptyForm());
    toast.success("Cari eklendi");
  };

  const saveEdit = () => {
    if (!editing) return;
    updateCari(editing.id, editing);
    setEditing(null);
    toast.success("Güncellendi");
  };

  const bulkDelete = () => {
    bulkRemove(sel.selectedIds);
    toast.success(`${sel.selectedIds.length} cari silindi`);
    sel.clear();
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
              <CariForm value={form} onChange={setForm} />
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
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari ara..." className="pl-9" />
              </div>
              {sel.selectedIds.length > 0 && (
                <Button variant="destructive" size="sm" onClick={bulkDelete}>
                  <Trash2 className="mr-1 h-4 w-4" /> Seçilenleri Sil ({sel.selectedIds.length})
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={sel.allChecked ? true : sel.someChecked ? "indeterminate" : false}
                        onCheckedChange={sel.toggleAll}
                      />
                    </TableHead>
                    <TableHead>Kod</TableHead>
                    <TableHead>Ünvan</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Vergi No</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead className="text-right">Bakiye</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} data-state={sel.selected.has(c.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox checked={sel.selected.has(c.id)} onCheckedChange={() => sel.toggle(c.id)} />
                      </TableCell>
                      <TableCell className="font-medium">{c.code}</TableCell>
                      <TableCell>{c.title}</TableCell>
                      <TableCell className="text-muted-foreground">{c.phone}</TableCell>
                      <TableCell className="text-muted-foreground">{c.taxNo}</TableCell>
                      <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                      <TableCell className={`text-right font-semibold ${c.balance >= 0 ? "text-success" : "text-destructive"}`}>{fmtTL(c.balance)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditing(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { removeCari(c.id); toast.success("Silindi"); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cariyi Düzenle</DialogTitle></DialogHeader>
          {editing && <CariForm value={editing} onChange={(v) => setEditing({ ...editing, ...v })} showStatus />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>İptal</Button>
            <Button onClick={saveEdit} className="gradient-primary text-primary-foreground">Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CariForm({ value, onChange, showStatus }: { value: any; onChange: (v: any) => void; showStatus?: boolean }) {
  const set = (patch: any) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Kod</Label><Input value={value.code} onChange={(e) => set({ code: e.target.value })} /></div>
        <div>
          <Label>Tip</Label>
          <Select value={value.type} onValueChange={(v) => set({ type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Müşteri">Müşteri</SelectItem>
              <SelectItem value="Tedarikçi">Tedarikçi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Ünvan</Label><Input value={value.title} onChange={(e) => set({ title: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Telefon</Label><Input value={value.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
        <div><Label>Vergi No</Label><Input value={value.taxNo} onChange={(e) => set({ taxNo: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Bakiye</Label><Input type="number" value={value.balance} onChange={(e) => set({ balance: +e.target.value })} /></div>
        {showStatus && (
          <div>
            <Label>Durum</Label>
            <Select value={value.status} onValueChange={(v) => set({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Aktif">Aktif</SelectItem>
                <SelectItem value="Pasif">Pasif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
