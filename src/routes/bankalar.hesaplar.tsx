import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Landmark, Plus, Trash2, Pencil, ImagePlus, ListOrdered } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listBanks, createBank, updateBank, deleteBank,
  fileToDataUrl, MAX_LOGO_BYTES, type BankRow,
} from "@/lib/bank-db";

export const Route = createFileRoute("/bankalar/hesaplar")({
  head: () => ({
    meta: [
      { title: "Banka Ekle — Fintra" },
      { name: "description", content: "Banka hesabı tanımlama ve yönetimi." },
    ],
  }),
  component: Page,
});

const CURRENCIES = ["TRY", "USD", "EUR", "GBP", "CHF"];

type FormState = {
  name: string;
  logo_url: string | null;
  iban: string;
  account_name: string;
  currency: string;
  description: string;
};

const emptyForm: FormState = {
  name: "", logo_url: null, iban: "", account_name: "",
  currency: "TRY", description: "",
};

function Page() {
  const qc = useQueryClient();
  const { data: banks = [], isLoading } = useQuery({
    queryKey: ["banks"],
    queryFn: listBanks,
  });

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<BankRow | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const openNew = () => { setEditId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (b: BankRow) => {
    setEditId(b.id);
    setForm({
      name: b.name,
      logo_url: b.logo_url,
      iban: b.iban ?? "",
      account_name: b.account_name ?? "",
      currency: b.currency,
      description: b.description ?? "",
    });
    setOpen(true);
  };

  const createMut = useMutation({
    mutationFn: (v: FormState) => createBank({
      name: v.name.trim(),
      logo_url: v.logo_url,
      iban: v.iban.trim() || null,
      account_name: v.account_name.trim() || null,
      currency: v.currency,
      description: v.description.trim() || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banks"] });
      toast.success("Banka eklendi");
      setOpen(false);
    },
    onError: (e: any) => toast.error("Kaydedilemedi", { description: e?.message }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, v }: { id: string; v: FormState }) => updateBank(id, {
      name: v.name.trim(),
      logo_url: v.logo_url,
      iban: v.iban.trim() || null,
      account_name: v.account_name.trim() || null,
      currency: v.currency,
      description: v.description.trim() || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banks"] });
      toast.success("Banka güncellendi");
      setOpen(false);
    },
    onError: (e: any) => toast.error("Güncellenemedi", { description: e?.message }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBank(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banks"] });
      qc.invalidateQueries({ queryKey: ["bank-tx"] });
      qc.invalidateQueries({ queryKey: ["bank-imports"] });
      toast.success("Banka silindi");
      setConfirmDelete(null);
    },
    onError: (e: any) => toast.error("Silinemedi", { description: e?.message }),
  });

  const save = () => {
    if (!form.name.trim()) return toast.error("Banka adı girin");
    if (editId) updateMut.mutate({ id: editId, v: form });
    else createMut.mutate(form);
  };

  const onLogoPick = async (file: File) => {
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Logo 512 KB'den küçük olmalı");
      return;
    }
    if (!/^image\/(png|jpeg|jpg|svg\+xml)$/.test(file.type)) {
      toast.error("Sadece PNG, JPG veya SVG yükleyin");
      return;
    }
    try {
      const url = await fileToDataUrl(file);
      setForm((f) => ({ ...f, logo_url: url }));
    } catch (e: any) {
      toast.error("Logo okunamadı", { description: e?.message });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banka Ekle"
        subtitle={`${banks.length} hesap`}
        actions={
          <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Yeni Banka
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Bankayı Düzenle" : "Yeni Banka"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Logo</Label>
              <div className="mt-1 flex items-center gap-3">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border bg-muted/40 overflow-hidden">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="Banka Logosu" className="h-full w-full object-contain" />
                  ) : (
                    <Landmark className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => logoRef.current?.click()}>
                    <ImagePlus className="mr-1 h-4 w-4" /> Logo Seç
                  </Button>
                  {form.logo_url && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setForm({ ...form, logo_url: null })}>
                      Kaldır
                    </Button>
                  )}
                  <input
                    ref={logoRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogoPick(f); e.target.value = ""; }}
                  />
                </div>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">PNG, JPG veya SVG · maks 512 KB</div>
            </div>

            <div>
              <Label>Banka Adı *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div>
              <Label>IBAN</Label>
              <Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase() })} placeholder="TR.." />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Hesap Adı</Label>
                <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} />
              </div>
              <div>
                <Label>Para Birimi</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <Label>Açıklama</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button
              onClick={save}
              className="gradient-primary text-primary-foreground"
              disabled={createMut.isPending || updateMut.isPending}
            >
              {createMut.isPending || updateMut.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bu bankayı silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              <b>{confirmDelete?.name}</b> ile birlikte tüm ekstre dosyaları ve hareketleri kalıcı olarak silinecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Yükleniyor...</div>
      ) : banks.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Henüz banka hesabı yok"
          desc="Yeni bir banka ekleyin, ardından Banka Ekstreleri sayfasından ekstre yükleyin."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banks.map((b) => (
            <Card key={b.id} className="glass overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border bg-muted/40 overflow-hidden">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt={`${b.name} Banka Logosu`} className="h-full w-full object-contain" />
                      ) : (
                        <Landmark className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold">{b.name}</div>
                      <div className="text-xs text-muted-foreground">{b.currency}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" title="Düzenle" onClick={() => openEdit(b)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Sil" onClick={() => setConfirmDelete(b)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {b.account_name && (
                  <div className="mt-3 text-xs text-muted-foreground">{b.account_name}</div>
                )}
                <div className="mt-1 text-xs font-mono text-muted-foreground truncate">{b.iban || "—"}</div>
                {b.description && (
                  <div className="mt-2 text-xs text-muted-foreground line-clamp-2">{b.description}</div>
                )}
                <Link to="/bankalar/ekstreler" search={{ bank: b.id } as any}>
                  <Button size="sm" variant="outline" className="mt-4 w-full">
                    <ListOrdered className="mr-1 h-4 w-4" /> Hareketleri Gör
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
