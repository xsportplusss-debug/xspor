// Bankalar modülü veri katmanı (Supabase) — kalıcı kayıt.
import { supabase } from "@/integrations/supabase/client";
import { txKey, type StdTx } from "./core";
import type { ImportReport } from "./registry";

export type BankRow = {
  id: string;
  name: string;
  bank_code: string | null;
  logo_url: string | null;
  iban: string | null;
  account_name: string | null;
  account_no: string | null;
  branch: string | null;
  currency: string;
  current_balance: number;
  last_statement_date: string | null;
  active: boolean;
  created_at: string;
};

export type TxRow = {
  id: string;
  bank_id: string;
  statement_id: string | null;
  date: string;
  tx_time: string | null;
  doc_no: string | null;
  description: string;
  debit: number;
  credit: number;
  balance: number | null;
  currency: string | null;
  file_name: string | null;
  source: string;
  statement_date: string | null;
  pdf_order: number;
  imported_at: string;
  created_at: string;
};

export type StatementRow = {
  id: string;
  bank_id: string | null;
  bank_name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  tx_count: number;
  total_debit: number;
  total_credit: number;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
};

const TX_COLS =
  "id,bank_id,statement_id,date,tx_time,doc_no,description,debit,credit,balance,currency,file_name,source,statement_date,pdf_order,imported_at,created_at";

const BANK_COLS =
  "id,name,bank_code,logo_url,iban,account_name,account_no,branch,currency,current_balance,last_statement_date,active,created_at";

async function uid(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Oturum bulunamadı");
  return data.user.id;
}

/* ---------- Bankalar ---------- */

export async function fetchBanks(): Promise<BankRow[]> {
  const { data, error } = await supabase
    .from("banks")
    .select(BANK_COLS)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as BankRow[];
}

export type BankInput = {
  name: string;
  bank_code?: string | null;
  logo_url?: string | null;
  iban?: string | null;
  account_name?: string | null;
  account_no?: string | null;
  branch?: string | null;
  currency?: string;
};

export async function createBank(input: BankInput): Promise<BankRow> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("banks")
    .insert({ user_id, currency: "TRY", ...input })
    .select(BANK_COLS)
    .single();
  if (error) throw error;
  return data as unknown as BankRow;
}

export async function updateBank(id: string, patch: Partial<BankInput>) {
  const { error } = await supabase
    .from("banks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Banka ve tüm hareketleri/ekstreleri kalıcı silinir. */
export async function deleteBank(id: string) {
  await supabase.from("bank_transactions").delete().eq("bank_id", id);
  await supabase.from("bank_statements").delete().eq("bank_id", id);
  await supabase.from("bank_imports").delete().eq("bank_id", id);
  const { error } = await supabase.from("banks").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- Logo ---------- */

export async function uploadLogo(file: File): Promise<string> {
  const user_id = await uid();
  const path = `${user_id}/${Date.now()}_${file.name.replace(/[^\w.\-]+/g, "_")}`;
  const { error } = await supabase.storage.from("bank-logos").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = await supabase.storage.from("bank-logos").createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? "";
}

/* ---------- Hareketler ---------- */

export async function fetchTransactions(bankId: string, statementId?: string): Promise<TxRow[]> {
  const page = 1000;
  const all: TxRow[] = [];
  for (let from = 0; ; from += page) {
    let q = supabase
      .from("bank_transactions")
      .select(TX_COLS)
      .eq("bank_id", bankId)
      .is("deleted_at", null)
      .order("date", { ascending: true })
      .order("pdf_order", { ascending: true })
      .order("created_at", { ascending: true })
      .range(from, from + page - 1);
    if (statementId) q = q.eq("statement_id", statementId);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as unknown as TxRow[];
    all.push(...rows);
    if (rows.length < page) break;
  }
  return all;
}

export type TxInput = {
  date: string;
  tx_time?: string | null;
  doc_no?: string | null;
  description: string;
  debit?: number;
  credit?: number;
  balance?: number | null;
};

/** O gün içindeki son satır sırası (manuel kayıt günün sonuna eklenir). */
async function nextOrder(bankId: string, date: string): Promise<number> {
  const { data } = await supabase
    .from("bank_transactions")
    .select("pdf_order")
    .eq("bank_id", bankId)
    .eq("date", date)
    .is("deleted_at", null)
    .order("pdf_order", { ascending: false })
    .limit(1);
  const top = (data?.[0] as { pdf_order?: number } | undefined)?.pdf_order ?? 0;
  return Number(top) + 1;
}

export async function addTransaction(bankId: string, input: TxInput): Promise<TxRow> {
  const user_id = await uid();
  const pdf_order = await nextOrder(bankId, input.date);
  const { data, error } = await supabase
    .from("bank_transactions")
    .insert({
      user_id,
      bank_id: bankId,
      date: input.date,
      pdf_order,

      tx_time: input.tx_time || null,
      doc_no: input.doc_no || null,
      description: input.description,
      debit: input.debit ?? 0,
      credit: input.credit ?? 0,
      balance: input.balance ?? null,
      source: "Manuel",
      direction: (input.credit ?? 0) >= (input.debit ?? 0) ? "in" : "out",
      dedup_key: txKey({
        date: input.date,
        time: input.tx_time ?? undefined,
        txNo: input.doc_no ?? undefined,
        amount: (input.credit ?? 0) - (input.debit ?? 0),
        description: input.description,
      }) + `|m${Date.now()}`,
    })
    .select(TX_COLS)
    .single();
  if (error) throw error;
  return data as unknown as TxRow;
}

export async function updateTransaction(id: string, patch: Partial<TxInput>) {
  const { error } = await supabase.from("bank_transactions").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTransactions(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase.from("bank_transactions").delete().in("id", ids);
  if (error) throw error;
}

/* ---------- Ekstreler / içe aktarma ---------- */

export async function fetchStatements(bankId?: string): Promise<StatementRow[]> {
  let q = supabase
    .from("bank_statements")
    .select("id,bank_id,bank_name,file_name,file_path,file_size,tx_count,total_debit,total_credit,period_start,period_end,created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (bankId) q = q.eq("bank_id", bankId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as StatementRow[];
}

export async function existingKeys(bankId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("bank_transactions")
    .select("dedup_key")
    .eq("bank_id", bankId)
    .not("dedup_key", "is", null);
  if (error) throw error;
  return new Set((data ?? []).map((r) => (r as { dedup_key: string }).dedup_key));
}

export async function deleteStatement(row: StatementRow) {
  await supabase.from("bank_transactions").delete().eq("statement_id", row.id);
  const { error } = await supabase.from("bank_statements").delete().eq("id", row.id);
  if (error) throw error;
  if (row.file_path) await supabase.storage.from("bank-statements").remove([row.file_path]);
}

export async function statementUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("bank-statements").createSignedUrl(path, 3600);
  if (error || !data) throw error ?? new Error("Bağlantı oluşturulamadı");
  return data.signedUrl;
}

export type CommitResult = { imported: number; duplicates: number; statementId: string };

/** Okunan hareketleri veritabanına yazar; mükerrerler atlanır. */
export async function commitImport(opts: {
  bank: BankRow;
  file: File;
  report: ImportReport;
  rows: StdTx[];
  onProgress?: (done: number, total: number) => void;
}): Promise<CommitResult> {
  const { bank, file, report, rows, onProgress } = opts;
  const user_id = await uid();

  const known = await existingKeys(bank.id).catch(() => new Set<string>());
  const fresh = rows.filter((r) => !known.has(txKey(r)));
  const duplicates = rows.length - fresh.length;

  const dates = rows.map((r) => r.date).filter(Boolean).sort();
  const periodStart = dates[0] ?? null;
  const periodEnd = dates[dates.length - 1] ?? null;

  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${user_id}/${Date.now()}_${safe}`;
  await supabase.storage.from("bank-statements").upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });

  const { data: stmt, error: sErr } = await supabase
    .from("bank_statements")
    .insert({
      user_id,
      bank_id: bank.id,
      bank_name: bank.name,
      account_name: bank.account_name ?? bank.account_no ?? "",
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      mime_type: file.type || null,
      status: "imported",
      period_start: periodStart,
      period_end: periodEnd,
      tx_count: fresh.length,
      total_debit: fresh.reduce((a, r) => a + (r.amount < 0 ? -r.amount : 0), 0),
      total_credit: fresh.reduce((a, r) => a + (r.amount > 0 ? r.amount : 0), 0),
    })
    .select("id")
    .single();
  if (sErr) throw sErr;
  const statementId = (stmt as { id: string }).id;

  const source = /\.pdf$/i.test(file.name) ? "PDF" : /\.csv$/i.test(file.name) ? "CSV" : "Excel";
  const payload = fresh.map((r) => ({
    user_id,
    bank_id: bank.id,
    statement_id: statementId,
    date: r.date,
    tx_time: r.time ?? null,
    doc_no: r.txNo ?? null,
    ref_no: r.txNo ?? null,
    description: r.description,
    debit: r.amount < 0 ? -r.amount : 0,
    credit: r.amount > 0 ? r.amount : 0,
    balance: r.balance ?? null,
    currency: r.currency ?? bank.currency ?? "TRY",
    file_name: file.name,
    statement_date: periodEnd,
    source,
    direction: r.amount >= 0 ? "in" : "out",
    raw: (r.raw ?? null) as never,
    dedup_key: txKey(r),
  }));

  let imported = 0;
  for (let i = 0; i < payload.length; i += 400) {
    const chunk = payload.slice(i, i + 400);
    const { data, error } = await supabase
      .from("bank_transactions")
      .upsert(chunk, { onConflict: "user_id,bank_id,dedup_key", ignoreDuplicates: true })
      .select("id");
    if (error) throw error;
    imported += (data ?? []).length;
    onProgress?.(Math.min(i + chunk.length, payload.length), payload.length);
  }

  await supabase.from("bank_statements").update({ tx_count: imported }).eq("id", statementId);
  await supabase
    .from("banks")
    .update({
      last_statement_date: periodEnd,
      current_balance: fresh[fresh.length - 1]?.balance ?? bank.current_balance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bank.id);
  await supabase.from("bank_imports").insert({
    user_id,
    bank_id: bank.id,
    file_name: file.name,
    file_type: source,
    parser: report.parser,
    tx_count: imported,
    status: "completed",
  });

  return { imported, duplicates: duplicates + report.duplicatesInFile, statementId };
}
