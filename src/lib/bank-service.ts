// Banka modülü veri katmanı — Supabase okuma/yazma.
import { supabase } from "@/integrations/supabase/client";
import type { StatementParseResult } from "@/lib/bank-parsers";
import { dedupKey, type RawTx } from "@/lib/bank-parsers";
import { classify } from "@/lib/tx-classifier";
import { logAudit } from "@/lib/audit";

export type DbTx = {
  id: string;
  bank_id: string;
  statement_id: string | null;
  date: string;
  value_date: string | null;
  tx_time: string | null;
  description: string;
  user_description: string | null;
  operation: string | null;
  category: string | null;
  note: string | null;
  doc_no: string | null;
  ref_no: string | null;
  debit: number;
  credit: number;
  balance: number | null;
  currency: string | null;
  branch: string | null;
  counterparty: string | null;
  counterparty_iban: string | null;
  file_name: string | null;
  source: string;
  direction: string | null;
  imported_at: string;
  created_at: string;
  raw: unknown;
  dedup_key: string | null;
};

export type DbStatement = {
  id: string;
  bank_id: string | null;
  bank_name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  status: string;
  tx_count: number;
  total_debit: number;
  total_credit: number;
  imported_by: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
};

const SELECT_TX =
  "id,bank_id,statement_id,date,value_date,tx_time,description,user_description,operation,category,note,doc_no,ref_no,debit,credit,balance,currency,branch,counterparty,counterparty_iban,file_name,source,direction,imported_at,created_at,raw,dedup_key";

export async function fetchBankTransactions(bankId: string): Promise<DbTx[]> {
  const page = 1000;
  let from = 0;
  const all: DbTx[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from("bank_transactions")
      .select(SELECT_TX)
      .eq("bank_id", bankId)
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .range(from, from + page - 1);
    if (error) throw error;
    const rows = (data ?? []) as unknown as DbTx[];
    all.push(...rows);
    if (rows.length < page) break;
    from += page;
  }
  return all;
}

export async function fetchStatements(bankId?: string): Promise<DbStatement[]> {
  let q = supabase
    .from("bank_statements")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (bankId) q = q.eq("bank_id", bankId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as DbStatement[];
}

export async function fetchExistingKeys(bankId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("bank_transactions")
    .select("dedup_key")
    .eq("bank_id", bankId)
    .not("dedup_key", "is", null);
  if (error) throw error;
  return new Set((data ?? []).map((r) => (r as { dedup_key: string }).dedup_key));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BankLike = {
  id: string; name: string; iban?: string; accountNo?: string;
  currency?: string; short?: string; active?: boolean;
};

export async function ensureBankInCloud(userId: string, bank: BankLike) {
  if (!UUID_RE.test(bank.id)) {
    throw new Error("Banka kaydı eski formatta. Sayfayı yenileyip tekrar deneyin.");
  }
  const { error } = await supabase.from("banks").upsert(
    {
      id: bank.id,
      user_id: userId,
      name: bank.name,
      iban: bank.iban || null,
      account_no: bank.accountNo || null,
      account_name: bank.short || bank.name,
      currency: bank.currency || "TRY",
      active: bank.active ?? true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function commitStatement(opts: {
  bank: BankLike;
  file: File;
  parsed: StatementParseResult;
  rows: RawTx[];
}): Promise<{ imported: number; statementId: string }> {
  const { bank, file, parsed, rows } = opts;
  const { data: u, error: uErr } = await supabase.auth.getUser();
  if (uErr || !u.user) throw new Error("Oturum bulunamadı");
  const uid = u.user.id;
  const email = u.user.email ?? null;

  await ensureBankInCloud(uid, bank);

  const dates = rows.map((r) => r.date).filter(Boolean).sort();
  const totalDebit = rows.reduce((a, r) => a + (r.amount < 0 ? -r.amount : 0), 0);
  const totalCredit = rows.reduce((a, r) => a + (r.amount > 0 ? r.amount : 0), 0);

  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${uid}/${Date.now()}_${safe}`;
  const { error: upErr } = await supabase.storage
    .from("bank-statements")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (upErr) throw upErr;

  const { data: stmt, error: sErr } = await supabase
    .from("bank_statements")
    .insert({
      user_id: uid,
      bank_id: bank.id,
      bank_name: bank.name,
      account_name: bank.accountNo || bank.short || bank.name,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      mime_type: file.type || null,
      status: "parsed",
      period_start: dates[0] ?? null,
      period_end: dates[dates.length - 1] ?? null,
      tx_count: rows.length,
      total_debit: totalDebit,
      total_credit: totalCredit,
      imported_by: email,
    })
    .select("id")
    .single();
  if (sErr) {
    await supabase.storage.from("bank-statements").remove([path]);
    throw sErr;
  }
  const statementId = stmt.id as string;

  const source = /\.pdf$/i.test(file.name) ? "PDF" : /\.csv$/i.test(file.name) ? "CSV" : "Excel";
  const payload = rows.map((r) => {
    const cls = classify(r.description, r.amount);
    return {
      user_id: uid,
      bank_id: bank.id,
      statement_id: statementId,
      date: r.date,
      value_date: r.valueDate ?? null,
      tx_time: r.time ?? null,
      description: r.description,
      operation: r.operation ?? null,
      doc_no: r.docNo ?? null,
      ref_no: r.refNo ?? null,
      debit: r.amount < 0 ? -r.amount : 0,
      credit: r.amount > 0 ? r.amount : 0,
      balance: r.balance ?? null,
      currency: r.currency ?? bank.currency ?? "TRY",
      branch: r.branch ?? null,
      counterparty: r.counterparty ?? null,
      counterparty_iban: r.counterpartyIban ?? null,
      file_name: file.name,
      source,
      category: cls.category,
      direction: r.amount >= 0 ? "in" : "out",
      raw: (r.raw ?? null) as never,
      dedup_key: dedupKey(r),
    };
  });

  let imported = 0;
  for (let i = 0; i < payload.length; i += 400) {
    const chunk = payload.slice(i, i + 400);
    const { data, error } = await supabase
      .from("bank_transactions")
      .upsert(chunk, { onConflict: "user_id,bank_id,dedup_key", ignoreDuplicates: true })
      .select("id");
    if (error) throw error;
    imported += (data ?? []).length;
  }

  const last = dates[dates.length - 1] ?? null;
  await supabase
    .from("banks")
    .update({ last_statement_date: last, updated_at: new Date().toISOString() })
    .eq("id", bank.id);

  await supabase.from("bank_statements").update({ tx_count: imported }).eq("id", statementId);

  // parser bilgisini import kaydına yaz (best-effort)
  await supabase.from("bank_imports").insert({
    user_id: uid,
    bank_id: bank.id,
    file_name: file.name,
    file_type: source,
    parser: parsed.parser,
    tx_count: imported,
    status: "completed",
  });

  await logAudit({
    action: "statement_uploaded",
    entity: "bank_statements",
    entityId: statementId,
    description: `${file.name} yüklendi (${bank.name})`,
    affected: imported,
    meta: { parser: parsed.parser, fileType: source },
  });

  return { imported, statementId };
}

/** Silme = çöp kutusuna taşıma. Dosya ve hareketler korunur, geri yüklenebilir. */
export async function deleteStatement(row: DbStatement) {
  const now = new Date().toISOString();
  const { error: tErr } = await supabase
    .from("bank_transactions")
    .update({ deleted_at: now })
    .eq("statement_id", row.id);
  if (tErr) throw tErr;
  const { error } = await supabase.from("bank_statements").update({ deleted_at: now }).eq("id", row.id);
  if (error) throw error;
  await logAudit({
    action: "statement_deleted",
    entity: "bank_statements",
    entityId: row.id,
    description: `${row.file_name} çöp kutusuna taşındı`,
    affected: row.tx_count,
  });
}

export async function restoreStatement(row: DbStatement) {
  const { error: tErr } = await supabase
    .from("bank_transactions")
    .update({ deleted_at: null })
    .eq("statement_id", row.id);
  if (tErr) throw tErr;
  const { error } = await supabase.from("bank_statements").update({ deleted_at: null }).eq("id", row.id);
  if (error) throw error;
  await logAudit({
    action: "statement_restored",
    entity: "bank_statements",
    entityId: row.id,
    description: `${row.file_name} geri yüklendi`,
    affected: row.tx_count,
  });
}

/** Çöp kutusundaki ekstreler. */
export async function fetchTrashedStatements(): Promise<DbStatement[]> {
  const { data, error } = await supabase
    .from("bank_statements")
    .select("*")
    .not("deleted_at", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DbStatement[];
}

/** Kalıcı silme — yalnızca çöp kutusundan açıkça istendiğinde. */
export async function purgeStatement(row: DbStatement) {
  await supabase.storage.from("bank-statements").remove([row.file_path]);
  const { error: tErr } = await supabase.from("bank_transactions").delete().eq("statement_id", row.id);
  if (tErr) throw tErr;
  const { error } = await supabase.from("bank_statements").delete().eq("id", row.id);
  if (error) throw error;
  await logAudit({
    action: "statement_deleted",
    entity: "bank_statements",
    entityId: row.id,
    description: `${row.file_name} kalıcı olarak silindi`,
  });
}

/** Hareketi çöp kutusuna taşı / geri yükle. */
export async function trashTransactions(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase
    .from("bank_transactions")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw error;
  await logAudit({ action: "tx_deleted", entity: "bank_transactions", affected: ids.length });
}

export async function restoreTransactions(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase.from("bank_transactions").update({ deleted_at: null }).in("id", ids);
  if (error) throw error;
  await logAudit({ action: "tx_restored", entity: "bank_transactions", affected: ids.length });
}

export async function fetchTrashedTransactions(bankId?: string): Promise<DbTx[]> {
  let q = supabase
    .from("bank_transactions")
    .select(SELECT_TX)
    .not("deleted_at", "is", null)
    .order("date", { ascending: false })
    .limit(1000);
  if (bankId) q = q.eq("bank_id", bankId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as DbTx[];
}

/* ---------- Hesaplar (Accounts) ---------- */

export type DbAccount = {
  id: string;
  bank_id: string;
  account_no: string | null;
  iban: string | null;
  account_name: string | null;
  currency: string;
  last_balance: number;
  active: boolean;
  created_at: string;
};

export async function fetchAccounts(bankId?: string): Promise<DbAccount[]> {
  let q = supabase
    .from("bank_accounts")
    .select("id,bank_id,account_no,iban,account_name,currency,last_balance,active,created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (bankId) q = q.eq("bank_id", bankId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as DbAccount[];
}

export async function createAccount(input: {
  bankId: string;
  accountNo?: string;
  iban?: string;
  accountName?: string;
  currency?: string;
}): Promise<DbAccount> {
  const { data: u, error: uErr } = await supabase.auth.getUser();
  if (uErr || !u.user) throw new Error("Oturum bulunamadı");
  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({
      user_id: u.user.id,
      bank_id: input.bankId,
      account_no: input.accountNo || null,
      iban: input.iban || null,
      account_name: input.accountName || null,
      currency: input.currency || "TRY",
    })
    .select("id,bank_id,account_no,iban,account_name,currency,last_balance,active,created_at")
    .single();
  if (error) throw error;
  await logAudit({
    action: "account_created",
    entity: "bank_accounts",
    entityId: (data as { id: string }).id,
    description: `${input.accountName || input.accountNo || input.iban || "Hesap"} oluşturuldu`,
  });
  return data as unknown as DbAccount;
}

export async function softDeleteAccount(id: string) {
  const { error } = await supabase
    .from("bank_accounts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await logAudit({ action: "account_deleted", entity: "bank_accounts", entityId: id });
}

export async function getStatementUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("bank-statements").createSignedUrl(path, 3600);
  if (error || !data) throw error ?? new Error("Bağlantı oluşturulamadı");
  return data.signedUrl;
}

export async function updateTransaction(
  id: string,
  patch: { user_description?: string | null; category?: string | null; note?: string | null },
) {
  const { error } = await supabase.from("bank_transactions").update(patch).eq("id", id);
  if (error) throw error;
  await logAudit({ action: "tx_updated", entity: "bank_transactions", entityId: id });
}
