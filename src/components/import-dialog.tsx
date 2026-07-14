import { useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { parseExcel, parsePdfLines, type Row } from "@/lib/importers";
import type { ReactNode } from "react";

type Props = {
  trigger: ReactNode;
  title: string;
  onExcel: (rows: Row[]) => number; // eklenen kayıt sayısı
  onPdf: (lines: string[][]) => number;
};

export function ImportDialog({ trigger, title, onExcel, onPdf }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleExcel(f?: File | null) {
    if (!f) return;
    setLoading(true);
    try {
      const rows = await parseExcel(f);
      const n = onExcel(rows);
      toast.success(`${n} kayıt içe aktarıldı`, { description: f.name });
      setOpen(false);
    } catch (e: any) {
      toast.error("Excel okunamadı", { description: e.message });
    } finally { setLoading(false); }
  }

  async function handlePdf(f?: File | null) {
    if (!f) return;
    setLoading(true);
    try {
      const lines = await parsePdfLines(f);
      const n = onPdf(lines);
      toast.success(`${n} kayıt içe aktarıldı`, { description: f.name });
      setOpen(false);
    } catch (e: any) {
      toast.error("PDF okunamadı", { description: e.message });
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="excel">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="excel">Excel</TabsTrigger>
            <TabsTrigger value="pdf">PDF</TabsTrigger>
          </TabsList>
          <TabsContent value="excel" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">
              İlk satır başlık olmalı. Tarih, No, Cari/Müşteri, Tutar gibi başlıklar otomatik eşlenir.
            </p>
            <Label htmlFor="xlsx">Excel dosyası (.xlsx, .xls, .csv)</Label>
            <Input id="xlsx" type="file" accept=".xlsx,.xls,.csv" disabled={loading}
              onChange={(e) => handleExcel(e.target.files?.[0])} />
          </TabsContent>
          <TabsContent value="pdf" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">
              Metin tabanlı PDF'ler desteklenir. Taranmış PDF'lerden veri çıkarılamaz.
            </p>
            <Label htmlFor="pdf">PDF dosyası</Label>
            <Input id="pdf" type="file" accept="application/pdf" disabled={loading}
              onChange={(e) => handlePdf(e.target.files?.[0])} />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Kapat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
