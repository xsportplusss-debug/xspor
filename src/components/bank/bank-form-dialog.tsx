import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { BANK_DEFS } from "@/lib/banks/registry";
import { createBank, updateBank, uploadLogo, type BankRow } from "@/lib/banks/service";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  bank?: BankRow | null;
  onSaved: () => void;
};

const EMPTY = {
  name: "", bank_code: "", logo_url: "", iban: "", account_name: "", account_no: "", branch: "", currency: "TRY",
};

export function BankFormDialog({ open, onOpenChange, bank, onSaved }: Props) {
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(
      bank
        ? {
            name: bank.name, bank_code: bank.bank_code ?? "", logo_url: bank.logo_url ?? "",
            iban: bank.iban ?? "", account_name: bank.account_name ?? "",
            account_no: bank.account_no ?? "", branch: bank.branch ?? "", currency: bank.currency,
          }
        : { ...EMPTY },
    );
  }, [open, bank]);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const pickLogo = async (f: File) => {
    setBusy(true);
    try {
      const url = await uploadLogo(f);
      set("logo_url", url);
      toast.success("Logo yüklendi");
    } catch (e) {
      toast.error("Logo yüklenemedi", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Banka adı zorunlu"); return; }
    if (!form.bank_code) { toast.error("Ekstre okuyucu (banka) seçin"); return; }
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        bank_code: form.bank_code,
        logo_url: form.logo_url || null,
        iban: form.iban.replace(/\s+/g, "").toUpperCase() || null,
        account_name: form.account_name || null,
        account_no: form.account_no || null,
        branch: form.branch || null,
        currency: form.currency || "TRY",
      };
      if (bank) await updateBank(bank.id, payload);
      else await createBank(payload);
      toast.success(bank ? "Banka güncellendi" : "Banka eklendi");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error("Kaydedilemedi", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{bank ? "Bankayı Düzenle" : "Yeni Banka Ekle"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 grid gap-1.5">
            <Label>Banka</Label>
            <Select
              value={form.bank_code}
              onValueChange={(v) => {
                set("bank_code", v);
                const d = BANK_DEFS.find((b) => b.code === v);
                if (d && !form.name) set("name", d.label);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Banka seçin" /></SelectTrigger>
              <SelectContent>
                {BANK_DEFS.map((b) => <SelectItem key={b.code} value={b.code}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Banka Adı</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Halkbank" />
          </div>
          <div className="grid gap-1.5">
            <Label>Şube</Label>
            <Input value={form.branch} onChange={(e) => set("branch", e.target.value)} placeholder="Kadıköy" />
          </div>
          <div className="sm:col-span-2 grid gap-1.5">
            <Label>IBAN</Label>
            <Input value={form.iban} onChange={(e) => set("iban", e.target.value)} placeholder="TR00 0000 0000 0000 0000 0000 00" />
          </div>
          <div className="grid gap-1.5">
            <Label>Hesap Adı</Label>
            <Input value={form.account_name} onChange={(e) => set("account_name", e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Hesap No</Label>
            <Input value={form.account_no} onChange={(e) => set("account_no", e.target.value)} />
          </div>

          <div className="sm:col-span-2 grid gap-1.5">
            <Label>Banka Logosu</Label>
            <div className="flex items-center gap-3">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Banka logosu" className="h-10 w-10 rounded object-contain" />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded bg-muted">
                  <ImagePlus className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
                Logo Seç
              </Button>
              <input
                ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void pickLogo(f); }}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Vazgeç</Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
