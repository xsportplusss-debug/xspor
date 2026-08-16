import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Cloud, Download, FileCode2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fmtTL } from "@/lib/mock-data";
import { getEdmInvoiceDetail, listEdmInvoices, syncEdmInvoices } from "@/lib/edm.functions";

type Props = { direction: "IN" | "OUT" };

const today = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

export function EdmInvoicePanel({ direction }: Props) {
  const qc = useQueryClient();
  const list = useServerFn(listEdmInvoices);
  const sync = useServerFn(syncEdmInvoices);
  const detailFn = useServerFn(getEdmInvoiceDetail);

  const [start, setStart] = useState(monthAgo());
  const [end, setEnd] = useState(today());
  const [sinceLast, setSinceLast] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showXml, setShowXml] = useState(false);

  const invoices = useQuery({
    queryKey: ["edm-invoices", direction],
    queryFn: () => list({ data: { direction } }),
  });

  const detail = useQuery({
    queryKey: ["edm-invoice", detailId],
    queryFn: () => detailFn({ data: { id: detailId! } }),
    enabled: !!detailId,
  });

  const pull = useMutation({
    mutationFn: () => sync({ data: { direction, startDate: start, endDate: end, sinceLastSync: sinceLast } }),
    onSuccess: (r) => {
      if (r.message) {
        toast.error(r.message);
        return;
      }
      toast.success(
        `EDM senkronizasyonu tamamlandı — Gelen: ${r.fetched} • Yeni: ${r.inserted} • Zaten kayıtlı: ${r.existing} • Hatalı: ${r.failed}`,
      );
      void qc.invalidateQueries({ queryKey: ["edm-invoices", direction] });
      void qc.invalidateQueries({ queryKey: ["edm-settings"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "EDM senkronizasyonu başarısız"),
  });

  const rows = invoices.data ?? [];
  const label = direction === "IN" ? "Gelen (Alış)" : "Giden (Satış)";
  const d = detail.data;

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Cloud className="h-4 w-4" /> EDM e-Fatura — {label}
        </CardTitle>
        <Badge variant="outline">{rows.length} fatura</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Başlangıç</Label>
            <Input type="date" value={start} disabled={sinceLast} onChange={(e) => setStart(e.target.value)} className="w-[150px]" />
          </div>
          <div>
            <Label className="text-xs">Bitiş</Label>
            <Input type="date" value={end} disabled={sinceLast} onChange={(e) => setEnd(e.target.value)} className="w-[150px]" />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <Checkbox checked={sinceLast} onCheckedChange={(v) => setSinceLast(!!v)} />
            Son senkronizasyondan sonra getir
          </label>
          <Button
            onClick={() => pull.mutate()}
            disabled={pull.isPending}
            className="gradient-primary text-primary-foreground"
          >
            {pull.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
            EDM'den {direction === "IN" ? "Gelen" : "Giden"} Faturaları Çek
          </Button>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz EDM'den çekilmiş fatura yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fatura No</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>{direction === "IN" ? "Satıcı" : "Alıcı"}</TableHead>
                  <TableHead>Senaryo</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">Genel Toplam</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.invoice_number ?? "—"}</TableCell>
                    <TableCell>{r.invoice_date ?? "—"}</TableCell>
                    <TableCell>{(direction === "IN" ? r.seller_name : r.buyer_name) ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.scenario ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.gib_status_desc ?? r.status ?? "—"}</TableCell>
                    <TableCell className="text-right">{fmtTL(r.grand_total)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => { setDetailId(r.id); setShowXml(false); }}>
                        Detay
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Fatura Detayı</DialogTitle></DialogHeader>
          {detail.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {d && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                <Info k="Fatura No" v={d.invoice.invoice_number} />
                <Info k="UUID" v={d.invoice.invoice_uuid} />
                <Info k="Tarih" v={d.invoice.invoice_date} />
                <Info k="Satıcı" v={`${d.invoice.seller_name ?? "—"} ${d.invoice.seller_vkn ?? ""}`} />
                <Info k="Alıcı" v={`${d.invoice.buyer_name ?? "—"} ${d.invoice.buyer_vkn ?? ""}`} />
                <Info k="Tip" v={d.invoice.invoice_type} />
                <Info k="Senaryo" v={d.invoice.scenario} />
                <Info k="Durum" v={d.invoice.gib_status_desc ?? d.invoice.status} />
                <Info k="Genel Toplam" v={fmtTL(Number(d.invoice.grand_total))} />
              </div>

              {d.lines.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün / Hizmet</TableHead>
                      <TableHead>Kod</TableHead>
                      <TableHead className="text-right">Miktar</TableHead>
                      <TableHead className="text-right">Birim Fiyat</TableHead>
                      <TableHead className="text-right">KDV %</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.lines.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{l.name ?? "Eşleşmeyen ürün"}</TableCell>
                        <TableCell>{l.code ?? "—"}</TableCell>
                        <TableCell className="text-right">{Number(l.quantity)} {l.unit ?? ""}</TableCell>
                        <TableCell className="text-right">{fmtTL(Number(l.unit_price))}</TableCell>
                        <TableCell className="text-right">{Number(l.vat_rate)}</TableCell>
                        <TableCell className="text-right">{fmtTL(Number(l.line_total))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="ml-auto w-full max-w-xs space-y-1">
                <Row k="Ara Toplam" v={fmtTL(Number(d.invoice.line_extension_amount))} />
                <Row k="İskonto" v={fmtTL(Number(d.invoice.discount_amount))} />
                <Row k="KDV" v={fmtTL(Number(d.invoice.tax_total))} />
                <Row k="Genel Toplam" v={fmtTL(Number(d.invoice.grand_total))} bold />
              </div>

              {d.invoice.ubl_xml && (
                <div>
                  <Button variant="outline" size="sm" onClick={() => setShowXml((s) => !s)}>
                    <FileCode2 className="mr-1 h-4 w-4" /> {showXml ? "XML'i Gizle" : "XML / UBL Görüntüle"}
                  </Button>
                  {showXml && (
                    <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
                      {d.invoice.ubl_xml}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Info({ k, v }: { k: string; v?: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="break-all font-medium">{v || "—"}</div>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "border-t pt-1 font-semibold" : ""}`}>
      <span className="text-muted-foreground">{k}</span>
      <span>{v}</span>
    </div>
  );
}
