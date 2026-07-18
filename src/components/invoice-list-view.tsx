import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckCircle2, ChevronsUpDown, Clock, FileSpreadsheet, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtTL, type Invoice, type InvoiceStatus } from "@/lib/mock-data";
import { ExcelImportDialog } from "@/components/excel-import-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { useSelection } from "@/hooks/use-selection";
import { INVOICE_TEMPLATE_HEADERS, rowsToInvoices } from "@/lib/importers";
import { useStore } from "@/lib/store";

type Kind = "sales" | "purchase";

type Props = {
  title: string;
  partyLabel: string;
  newPrefix: string;
  kind: Kind;
  list: Invoice[];
  add: (v: Omit<Invoice, "id">) => void;
  bulkAdd: (v: Omit<Invoice, "id">[]) => void;
  update: (id: string, patch: Partial<Invoice>) => void;
  bulkUpdate: (ids: string[], patch: Partial<Invoice>) => void;
  remove: (id: string) => void;
  bulkRemove: (ids: string[]) => void;
};

const STATUS_SALES: InvoiceStatus[] = ["Ödeme Bekleniyor", "Tahsil Edildi", "Onaylı", "Taslak", "İptal"];
const STATUS_PURCHASE: InvoiceStatus[] = ["Ödeme Yapılacak", "Ödendi", "Onaylı", "Taslak", "İptal"];

const emptyForm = (prefix: string): Omit<Invoice, "id"> => ({
  no: `${prefix}-${Date.now().toString().slice(-6)}`,
  date: new Date().toISOString().slice(0, 10),
  party: "",
  subtotal: 0, vat: 0, discount: 0, total: 0,
  status: "Ödeme Bekleniyor",
});

export function InvoiceListView({
  title, partyLabel, newPrefix, kind, list, add, bulkAdd, update, bulkUpdate, remove, bulkRemove,
}: Props) {
  const [q, setQ] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState<Omit<Invoice, "id">>(emptyForm(newPrefix));
  const [editing, setEditing] = useState<Invoice | null>(null);

  const statuses = kind === "sales" ? STATUS_SALES : STATUS_PURCHASE;
  const primaryPaid: InvoiceStatus = kind === "sales" ? "Tahsil Edildi" : "Ödendi";
  const primaryWait: InvoiceStatus = kind === "sales" ? "Ödeme Bekleniyor" : "Ödeme Yapılacak";

  const sorted = useMemo(
    () => [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [list],
  );
  const filtered = sorted.filter(
    (s) => s.no.toLowerCase().includes(q.toLowerCase()) || s.party.toLowerCase().includes(q.toLowerCase()),
  );
  const sel = useSelection(filtered);

  const calc = (f: Omit<Invoice, "id">) => (f.subtotal ?? 0) + (f.vat ?? 0) - (f.discount ?? 0);

  function saveNew() {
    if (!form.party) return toast.error(`${partyLabel} girin`);
    add({ ...form, total: form.total || calc(form) });
    setOpenNew(false);
    setForm(emptyForm(newPrefix));
    toast.success("Kaydedildi");
  }
  function saveEdit() {
    if (!editing) return;
    update(editing.id, { ...editing, total: editing.total || calc(editing) });
    setEditing(null);
    toast.success("Güncellendi");
  }

  const targetIds = sel.selectedIds.length ? sel.selectedIds : filtered.map((x) => x.id);
  const targetLabel = sel.selectedIds.length ? `Seçili (${sel.selectedIds.length})` : `Tümü (${filtered.length})`;

  function setStatusAll(status: InvoiceStatus) {
    if (!targetIds.length) return toast.error("Kayıt yok");
    bulkUpdate(targetIds, { status });
    toast.success(`${targetIds.length} kayıt → ${status}`);
    sel.clear();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={`${list.length} kayıt`}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Durum: {targetLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusAll(primaryPaid)}>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-success" /> {primaryPaid}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusAll(primaryWait)}>
                  <Clock className="mr-2 h-4 w-4 text-warning" /> {primaryWait}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ExcelImportDialog
              title={`${title} — Excel içe aktar`}
              description="Şablon başlıklarına göre otomatik eşlenir."
              templateName={`${title.toLowerCase().replace(/\s+/g, "-")}-sablon.xlsx`}
              templateHeaders={INVOICE_TEMPLATE_HEADERS}
              templateSample={[["FTR2026000001", new Date(), "Örnek Firma A.Ş.", 1000, 200, 0, 1200]]}
              onImport={(rows) => { const l = rowsToInvoices(rows); bulkAdd(l); return l.length; }}
              trigger={<Button variant="outline" size="sm"><FileSpreadsheet className="mr-1 h-4 w-4" /> Excel</Button>}
            />
            <Dialog open={openNew} onOpenChange={(v) => { setOpenNew(v); if (v) setForm(emptyForm(newPrefix)); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
                  <Plus className="mr-1 h-4 w-4" /> Yeni Fatura
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Yeni {title}</DialogTitle></DialogHeader>
                <InvoiceForm value={form} onChange={setForm} partyLabel={partyLabel} statuses={statuses} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenNew(false)}>İptal</Button>
                  <Button onClick={saveNew} className="gradient-primary text-primary-foreground">Kaydet</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {list.length === 0 ? (
        <EmptyState title={`Henüz ${title.toLowerCase()} yok`} desc="Yeni fatura oluşturun veya Excel'den içe aktarın." />
      ) : (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Fatura no veya firma ara..." className="pl-9" />
              </div>
              {sel.selectedIds.length > 0 && (
                <Button variant="destructive" size="sm" onClick={() => { bulkRemove(sel.selectedIds); sel.clear(); }}>
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
                    <TableHead>Fatura No</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>{partyLabel}</TableHead>
                    <TableHead className="text-right">KDV Hariç</TableHead>
                    <TableHead className="text-right">KDV</TableHead>
                    <TableHead className="text-right">İskonto</TableHead>
                    <TableHead className="text-right">Genel Toplam</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id} data-state={sel.selected.has(s.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox checked={sel.selected.has(s.id)} onCheckedChange={() => sel.toggle(s.id)} />
                      </TableCell>
                      <TableCell className="font-medium">{s.no}</TableCell>
                      <TableCell className="text-muted-foreground">{s.date}</TableCell>
                      <TableCell className="max-w-[240px] truncate">{s.party}</TableCell>
                      <TableCell className="text-right">{s.subtotal ? fmtTL(s.subtotal) : "—"}</TableCell>
                      <TableCell className="text-right">{s.vat ? fmtTL(s.vat) : "—"}</TableCell>
                      <TableCell className="text-right">{s.discount ? fmtTL(s.discount) : "—"}</TableCell>
                      <TableCell className="text-right font-semibold">{fmtTL(s.total)}</TableCell>
                      <TableCell>
                        <Select value={s.status} onValueChange={(v) => update(s.id, { status: v as InvoiceStatus })}>
                          <SelectTrigger className="h-7 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {statuses.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditing(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { remove(s.id); toast.success("Silindi"); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {filtered.length > 0 && (() => {
                  const sub = filtered.reduce((a, x) => a + (x.subtotal ?? 0), 0);
                  const vat = filtered.reduce((a, x) => a + (x.vat ?? 0), 0);
                  const disc = filtered.reduce((a, x) => a + (x.discount ?? 0), 0);
                  const tot = filtered.reduce((a, x) => a + x.total, 0);
                  return (
                    <TableFooter>
                      <TableRow className="bg-muted/40 font-semibold">
                        <TableCell colSpan={4} className="text-right">TOPLAM ({filtered.length})</TableCell>
                        <TableCell className="text-right">{fmtTL(sub)}</TableCell>
                        <TableCell className="text-right">{fmtTL(vat)}</TableCell>
                        <TableCell className="text-right">{fmtTL(disc)}</TableCell>
                        <TableCell className="text-right text-primary">{fmtTL(tot)}</TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </TableFooter>
                  );
                })()}
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Faturayı Düzenle</DialogTitle></DialogHeader>
          {editing && (
            <InvoiceForm
              value={editing}
              onChange={(v) => setEditing({ ...editing, ...v })}
              partyLabel={partyLabel}
              statuses={statuses}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>İptal</Button>
            <Button onClick={saveEdit} className="gradient-primary text-primary-foreground">Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvoiceForm({
  value, onChange, partyLabel, statuses,
}: {
  value: Omit<Invoice, "id"> | Invoice;
  onChange: (v: any) => void;
  partyLabel: string;
  statuses: InvoiceStatus[];
}) {
  const cariList = useStore((s) => s.cariList);
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<Invoice>) => onChange({ ...value, ...patch });
  const auto = (value.subtotal ?? 0) + (value.vat ?? 0) - (value.discount ?? 0);

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Fatura No</Label><Input value={value.no} onChange={(e) => set({ no: e.target.value })} /></div>
        <div><Label>Tarih</Label><Input type="date" value={value.date} onChange={(e) => set({ date: e.target.value })} /></div>
      </div>
      <div>
        <Label>{partyLabel}</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
              <span className={value.party ? "" : "text-muted-foreground"}>{value.party || `${partyLabel} seçin veya yazın...`}</span>
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="İsimle ara..." value={value.party} onValueChange={(v) => set({ party: v })} />
              <CommandList>
                <CommandEmpty>Cari bulunamadı. Yazdığınız isim kullanılacak.</CommandEmpty>
                <CommandGroup>
                  {cariList.map((c) => (
                    <CommandItem key={c.id} value={c.title} onSelect={() => { set({ party: c.title }); setOpen(false); }}>
                      <div>
                        <div className="font-medium">{c.title}</div>
                        <div className="text-xs text-muted-foreground">{c.code} · {c.phone || c.taxNo || "—"}</div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><Label>KDV Hariç</Label>
          <Input type="number" value={value.subtotal ?? 0} onChange={(e) => set({ subtotal: +e.target.value })} /></div>
        <div><Label>KDV</Label>
          <Input type="number" value={value.vat ?? 0} onChange={(e) => set({ vat: +e.target.value })} /></div>
        <div><Label>İskonto</Label>
          <Input type="number" value={value.discount ?? 0} onChange={(e) => set({ discount: +e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Genel Toplam</Label>
          <Input type="number" value={value.total} onChange={(e) => set({ total: +e.target.value })} placeholder={String(auto)} />
          <p className="mt-1 text-xs text-muted-foreground">Boş: {fmtTL(auto)}</p>
        </div>
        <div>
          <Label>Durum</Label>
          <Select value={value.status} onValueChange={(v) => set({ status: v as InvoiceStatus })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {statuses.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
