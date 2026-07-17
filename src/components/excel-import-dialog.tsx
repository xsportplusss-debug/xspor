import { useState, type ReactNode } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { parseExcel, downloadTemplate, type Row } from "@/lib/importers";

type Props = {
  trigger: ReactNode;
  title: string;
  description?: string;
  templateName: string;
  templateHeaders: string[];
  templateSample?: any[][];
  onImport: (rows: Row[]) => number;
};

export function ExcelImportDialog({
  trigger, title, description, templateName, templateHeaders, templateSample, onImport,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handle(f?: File | null) {
    if (!f) return;
    setLoading(true);
    try {
      const rows = await parseExcel(f);
      const n = onImport(rows);
      if (n > 0) toast.success(`${n} kayıt içe aktarıldı`, { description: f.name });
      else toast.warning("Hiç kayıt eklenmedi", { description: "Sütun başlıklarını şablonla karşılaştırın." });
      setOpen(false);
    } catch (e: any) {
      toast.error("Excel okunamadı", { description: e.message });
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs font-medium">Beklenen sütun başlıkları</div>
            <div className="mt-1 text-xs text-muted-foreground">{templateHeaders.join(" · ")}</div>
            <Button
              type="button" variant="outline" size="sm" className="mt-3"
              onClick={() => downloadTemplate(templateName, templateHeaders, templateSample)}
            >
              <Download className="mr-1 h-4 w-4" /> Şablonu indir
            </Button>
          </div>
          <div>
            <Label htmlFor="xlsx">Excel dosyası (.xlsx, .xls, .csv)</Label>
            <Input id="xlsx" type="file" accept=".xlsx,.xls,.csv" disabled={loading}
              onChange={(e) => handle(e.target.files?.[0])} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Kapat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
