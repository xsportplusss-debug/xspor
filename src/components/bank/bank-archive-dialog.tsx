// Çöp kutusu + işlem günlüğü — kalıcı kayıt sisteminin kullanıcı arayüzü.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/lib/mock-data";
import {
  fetchTrashedStatements, fetchTrashedTransactions, restoreStatement,
  purgeStatement, restoreTransactions, type DbStatement,
} from "@/lib/bank-service";
import { fetchAuditLogs } from "@/lib/audit";

const dt = (s: string) => new Date(s).toLocaleString("tr-TR");

export function BankArchiveDialog({
  open, onOpenChange, tab = "trash",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tab?: "trash" | "logs";
}) {
  const qc = useQueryClient();

  const trashStmts = useQuery({
    queryKey: ["trash-statements"],
    queryFn: fetchTrashedStatements,
    enabled: open,
  });
  const trashTx = useQuery({
    queryKey: ["trash-tx"],
    queryFn: () => fetchTrashedTransactions(),
    enabled: open,
  });
  const logs = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => fetchAuditLogs(200),
    enabled: open,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["trash-statements"] });
    qc.invalidateQueries({ queryKey: ["trash-tx"] });
    qc.invalidateQueries({ queryKey: ["audit-logs"] });
    qc.invalidateQueries({ queryKey: ["bank-summary"] });
    qc.invalidateQueries({ queryKey: ["bank-tx"] });
    qc.invalidateQueries({ queryKey: ["bank-statements"] });
  };

  const onRestore = async (row: DbStatement) => {
    try {
      await restoreStatement(row);
      toast.success("Ekstre geri yüklendi");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onPurge = async (row: DbStatement) => {
    if (!confirm(`${row.file_name} kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return;
    try {
      await purgeStatement(row);
      toast.success("Kalıcı olarak silindi");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Arşiv — Çöp Kutusu & İşlem Günlüğü</DialogTitle></DialogHeader>
        <Tabs defaultValue={tab}>
          <TabsList>
            <TabsTrigger value="trash">Çöp Kutusu</TabsTrigger>
            <TabsTrigger value="logs">İşlem Günlüğü</TabsTrigger>
          </TabsList>

          <TabsContent value="trash" className="space-y-4">
            <div className="max-h-[45vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dosya</TableHead>
                    <TableHead>Banka</TableHead>
                    <TableHead className="text-right">Hareket</TableHead>
                    <TableHead className="text-right">Borç / Alacak</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(trashStmts.data ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="max-w-[220px] truncate">{r.file_name}</TableCell>
                      <TableCell>{r.bank_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.tx_count}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmt(Number(r.total_debit))} / {fmt(Number(r.total_credit))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => onRestore(r)}>
                          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Geri Yükle
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => onPurge(r)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!trashStmts.isLoading && (trashStmts.data ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      Çöp kutusunda ekstre yok
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {(trashTx.data ?? []).length > 0 && (
              <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                <span>{trashTx.data!.length} silinmiş hareket çöp kutusunda saklanıyor.</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await restoreTransactions(trashTx.data!.map((t) => t.id));
                    toast.success("Hareketler geri yüklendi");
                    refresh();
                  }}
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Tümünü Geri Yükle
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs">
            <div className="max-h-[55vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>İşlem</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead className="text-right">Kayıt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(logs.data ?? []).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap text-xs">{dt(l.created_at)}</TableCell>
                      <TableCell><Badge variant="secondary">{l.action}</Badge></TableCell>
                      <TableCell className="max-w-[320px] truncate">{l.description}</TableCell>
                      <TableCell className="text-right tabular-nums">{l.affected_count}</TableCell>
                    </TableRow>
                  ))}
                  {logs.isLoading && (
                    <TableRow><TableCell colSpan={4} className="text-center">
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    </TableCell></TableRow>
                  )}
                  {!logs.isLoading && (logs.data ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      Henüz kayıt yok
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
