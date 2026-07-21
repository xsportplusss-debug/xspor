import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Landmark, Plus, Power, Trash2, Upload, History, Download, FileX, Loader2, FileText,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { fmt } from "@/lib/mock-data";
import { useStore, bankBalance } from "@/lib/store";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";



export const Route = createFileRoute("/bankalar")({
  head: () => ({
    meta: [
      { title: "Bankalar — Fintra" },
      { name: "description", content: "Banka hesapları ve hareketleri." },
    ],
  }),
  component: Page,
});

const COLORS = ["#00A651", "#0055A4", "#004990", "#E30613", "#7B2CBF", "#F27A1A"];

function Page() {
  const banks = useStore((s) => s.banks);
  const bankTx = useStore((s) => s.bankTx);
  const addBank = useStore((s) => s.addBank);
  const removeBank = useStore((s) => s.removeBank);
  const updateBank = useStore((s) => s.updateBank);

  const metrics = useMemo(() => {
    const m: Record<string, { in: number; out: number; last: string; count: number }> = {};
    for (const b of banks) m[b.id] = { in: 0, out: 0, last: "", count: 0 };
    for (const t of bankTx) {
      const x = m[t.bankId]; if (!x) continue;
      x.count++;
      if (t.amount >= 0) x.in += t.amount; else x.out += -t.amount;
      if (!x.last || t.date > x.last) x.last = t.date;
    }
    return m;
  }, [banks, bankTx]);


  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", short: "", iban: "", currency: "TRY", balance: 0, color: COLORS[0] });

  const save = () => {
    if (!form.name) return toast.error("Banka adı girin");
    addBank(form);
    setOpen(false);
    setForm({ name: "", short: "", iban: "", currency: "TRY", balance: 0, color: COLORS[0] });
    toast.success("Banka eklendi");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bankalar"
        subtitle={`${banks.length} hesap`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
                <Plus className="mr-1 h-4 w-4" /> Yeni Hesap
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Yeni Banka Hesabı</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2"><Label>Ad</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>Kısaltma</Label><Input value={form.short} onChange={(e) => setForm({ ...form, short: e.target.value.toUpperCase() })} /></div>
                </div>
                <div><Label>IBAN</Label><Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Para Birimi</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
                  <div><Label>Açılış Bakiyesi</Label><Input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: +e.target.value })} /></div>
                </div>
                <div>
                  <Label>Renk</Label>
                  <div className="mt-1 flex gap-2">
                    {COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                        className={`h-8 w-8 rounded-lg ring-2 ${form.color === c ? "ring-foreground" : "ring-transparent"}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                <Button onClick={save} className="gradient-primary text-primary-foreground">Kaydet</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <BankStatementsSection />


      {banks.length === 0 ? (
        <EmptyState icon={Landmark} title="Henüz banka hesabı yok" desc="Yeni hesap ekleyin, ardından hareket girin veya ekstre içe aktarın." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banks.map((b) => {
            const active = b.active !== false;
            const mm = metrics[b.id];
            return (
            <Card key={b.id} className={`glass overflow-hidden ${active ? "" : "opacity-60"}`}>
              <div className="h-1.5" style={{ backgroundColor: b.color }} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ backgroundColor: b.color }}>
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    {!active && <Badge variant="outline" className="text-[10px]">Pasif</Badge>}
                    <Button variant="ghost" size="icon" title={active ? "Pasif Yap" : "Aktif Yap"}
                      onClick={() => updateBank(b.id, { active: !active })}>
                      <Power className={`h-4 w-4 ${active ? "text-success" : "text-muted-foreground"}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Hesap ve hareketleri silinsin mi?")) removeBank(b.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 text-base font-semibold">{b.name}</div>
                <div className="mt-1 text-xs font-mono text-muted-foreground truncate">{b.iban || "—"}</div>
                <div className="mt-4 text-xs text-muted-foreground">Güncel Bakiye</div>
                <div className="text-2xl font-bold tracking-tight">{fmt(bankBalance(b.id), b.currency)}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-md bg-success/10 p-2">
                    <div className="text-muted-foreground">Toplam Gelen</div>
                    <div className="font-semibold text-success">{fmt(mm.in, b.currency)}</div>
                  </div>
                  <div className="rounded-md bg-destructive/10 p-2">
                    <div className="text-muted-foreground">Toplam Giden</div>
                    <div className="font-semibold text-destructive">{fmt(mm.out, b.currency)}</div>
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                  <span>Son: {mm.last || "—"}</span>
                  <span>{mm.count} hareket</span>
                </div>
                <Link to="/bankalar/$id" params={{ id: b.id }}>
                  <Button variant="outline" size="sm" className="mt-4 w-full">Hareketler</Button>
                </Link>
              </CardContent>
            </Card>
            );
          })}

        </div>
      )}
    </div>
  );
}

// ---------- Ekstre (Bank Statements) ----------

type BankStatement = {
  id: string;
  user_id: string;
  bank_name: string;
  account_name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  status: string;
  created_at: string;
};

const ACCEPTED_EXT = ["pdf", "xlsx", "xls", "csv"];
const ACCEPT_ATTR = ".pdf,.xlsx,.xls,.csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";

function formatSize(n: number) {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function BankStatementsSection() {
  const qc = useQueryClient();
  const banks = useStore((s) => s.banks);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BankStatement | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["bank-statements"],
    queryFn: async (): Promise<BankStatement[]> => {
      const { data, error } = await supabase
        .from("bank_statements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BankStatement[];
    },
  });

  const list = data ?? [];

  const downloadOne = async (row: BankStatement) => {
    const { data: file, error } = await supabase.storage.from("bank-statements").download(row.file_path);
    if (error || !file) { toast.error(`İndirilemedi: ${error?.message ?? "bilinmeyen hata"}`); return; }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url; a.download = row.file_name;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const deleteMut = useMutation({
    mutationFn: async (row: BankStatement) => {
      const { error: sErr } = await supabase.storage.from("bank-statements").remove([row.file_path]);
      if (sErr) throw sErr;
      const { error: dErr } = await supabase.from("bank_statements").delete().eq("id", row.id);
      if (dErr) throw dErr;
    },
    onSuccess: () => {
      toast.success("Ekstre silindi");
      qc.invalidateQueries({ queryKey: ["bank-statements"] });
    },
    onError: (e: unknown) => toast.error(`Silinemedi: ${(e as Error).message}`),
    onSettled: () => setDeleteTarget(null),
  });

  const totalSize = useMemo(() => list.reduce((a, x) => a + (x.file_size || 0), 0), [list]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard
          icon={Upload}
          title="Ekstre Yükle"
          desc="PDF, XLSX, XLS, CSV"
          tone="primary"
          onClick={() => setUploadOpen(true)}
        />
        <ActionCard
          icon={History}
          title="Ekstre Geçmişi"
          desc={`${list.length} kayıt`}
          tone="info"
          onClick={() => document.getElementById("ekstre-tablo")?.scrollIntoView({ behavior: "smooth" })}
        />
        <ActionCard
          icon={Download}
          title="Ekstre İndir"
          desc={`Toplam ${formatSize(totalSize)}`}
          tone="success"
          onClick={() => document.getElementById("ekstre-tablo")?.scrollIntoView({ behavior: "smooth" })}
        />
        <ActionCard
          icon={FileX}
          title="Ekstre Sil"
          desc="Satırdan silin"
          tone="destructive"
          onClick={() => document.getElementById("ekstre-tablo")?.scrollIntoView({ behavior: "smooth" })}
        />
      </div>

      <Card id="ekstre-tablo" className="glass">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-semibold">Ekstre Geçmişi</div>
              <Badge variant="outline" className="text-[10px]">{list.length}</Badge>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Yenile</Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
            </div>
          ) : isError ? (
            <div className="p-6 text-sm text-destructive">
              Hata: {(error as Error)?.message ?? "Ekstreler yüklenemedi"}
              <Button size="sm" variant="outline" className="ml-3" onClick={() => refetch()}>Tekrar Dene</Button>
            </div>
          ) : list.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Henüz ekstre yüklenmedi. Yukarıdan <b>Ekstre Yükle</b> ile başlayın.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banka</TableHead>
                    <TableHead>Hesap</TableHead>
                    <TableHead>Dosya Adı</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Boyut</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.bank_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.account_name || "—"}</TableCell>
                      <TableCell className="max-w-[240px] truncate" title={r.file_name}>{r.file_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("tr-TR")}</TableCell>
                      <TableCell className="text-xs">{formatSize(r.file_size)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">{r.status || "uploaded"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title="İndir" onClick={() => downloadOne(r)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Sil" onClick={() => setDeleteTarget(r)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UploadStatementDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        banks={banks}
        onUploaded={() => qc.invalidateQueries({ queryKey: ["bank-statements"] })}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ekstre silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              <b>{deleteTarget?.file_name}</b> hem depolamadan hem de veritabanından kalıcı olarak silinecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget)}
            >
              {deleteMut.isPending ? "Siliniyor…" : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActionCard({
  icon: Icon, title, desc, tone, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; desc: string;
  tone: "primary" | "info" | "success" | "destructive";
  onClick: () => void;
}) {
  const toneMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    info: "bg-info/10 text-info",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card className="glass transition hover:shadow-elegant hover:-translate-y-0.5">
        <CardContent className="flex items-center gap-3 p-4">
          <div className={`grid h-11 w-11 place-items-center rounded-xl ${toneMap[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">{title}</div>
            <div className="truncate text-xs text-muted-foreground">{desc}</div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function UploadStatementDialog({
  open, onOpenChange, banks, onUploaded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  banks: { id: string; name: string }[];
  onUploaded: () => void;
}) {
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Dosya seçin");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ACCEPTED_EXT.includes(ext)) throw new Error("Sadece PDF, XLSX, XLS, CSV desteklenir");
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error("Oturum bulunamadı");
      const uid = userData.user.id;
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${uid}/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage
        .from("bank-statements")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("bank_statements").insert({
        user_id: uid,
        bank_name: bankName || "—",
        account_name: accountName || "—",
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type || ext,
        status: "uploaded",
      });
      if (dbErr) {
        await supabase.storage.from("bank-statements").remove([path]);
        throw dbErr;
      }
    },
    onSuccess: () => {
      toast.success("Ekstre yüklendi");
      setBankName(""); setAccountName(""); setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onOpenChange(false);
      onUploaded();
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Yüklenemedi"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ekstre Yükle</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Banka</Label>
            {banks.length > 0 ? (
              <Select value={bankName} onValueChange={setBankName}>
                <SelectTrigger><SelectValue placeholder="Banka seçin veya yazın" /></SelectTrigger>
                <SelectContent>
                  {banks.map((b) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Ör. Vakıfbank" />
            )}
          </div>
          <div>
            <Label>Hesap Adı</Label>
            <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Ör. TL Ticari" />
          </div>
          <div>
            <Label>Dosya</Label>
            <Input
              ref={inputRef}
              type="file"
              accept={ACCEPT_ATTR}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="mt-1 text-xs text-muted-foreground">{file.name} — {formatSize(file.size)}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button
            className="gradient-primary text-primary-foreground"
            disabled={!file || upload.isPending}
            onClick={() => upload.mutate()}
          >
            {upload.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Yükleniyor</> : <><Upload className="mr-1 h-4 w-4" /> Yükle</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

