// Denetim günlüğü — her işlem otomatik kaydedilir (best-effort, hata akışı bozmaz).
import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "bank_created" | "bank_updated" | "bank_deleted" | "bank_restored"
  | "account_created" | "account_updated" | "account_deleted"
  | "statement_uploaded" | "statement_deleted" | "statement_restored"
  | "tx_created" | "tx_updated" | "tx_deleted" | "tx_restored"
  | "bulk_import" | "export";

export const AUDIT_LABELS: Record<AuditAction, string> = {
  bank_created: "Yeni banka eklendi",
  bank_updated: "Banka güncellendi",
  bank_deleted: "Banka çöp kutusuna taşındı",
  bank_restored: "Banka geri yüklendi",
  account_created: "Yeni hesap oluşturuldu",
  account_updated: "Hesap güncellendi",
  account_deleted: "Hesap silindi",
  statement_uploaded: "Dosya yüklendi",
  statement_deleted: "Ekstre çöp kutusuna taşındı",
  statement_restored: "Ekstre geri yüklendi",
  tx_created: "Hareket eklendi",
  tx_updated: "Hareket güncellendi",
  tx_deleted: "Hareket çöp kutusuna taşındı",
  tx_restored: "Hareket geri yüklendi",
  bulk_import: "Toplu içe aktarma yapıldı",
  export: "Dışa aktarma yapıldı",
};

export type AuditLog = {
  id: string;
  action: AuditAction;
  entity: string;
  entity_id: string | null;
  description: string | null;
  actor: string | null;
  affected_count: number;
  created_at: string;
};

export async function logAudit(opts: {
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  description?: string;
  affected?: number;
  meta?: Record<string, unknown>;
}) {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: opts.action,
      entity: opts.entity,
      entity_id: opts.entityId ?? null,
      description: opts.description ?? AUDIT_LABELS[opts.action],
      actor: user.email ?? null,
      affected_count: opts.affected ?? 1,
      meta: (opts.meta ?? null) as never,
    });
  } catch {
    /* günlük yazımı uygulamayı bloklamaz */
  }
}

export async function fetchAuditLogs(limit = 200): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id,action,entity,entity_id,description,actor,affected_count,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as AuditLog[];
}
