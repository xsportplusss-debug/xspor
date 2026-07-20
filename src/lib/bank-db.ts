// Supabase CRUD helpers for Bankalar module.
import { supabase } from "@/integrations/supabase/client";

export type BankRow = {
  id: string;
  name: string;
  logo_url: string | null;
  iban: string | null;
  account_name: string | null;
  currency: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type BankImportRow = {
  id: string;
  bank_id: string;
  file_name: string;
  file_type: string;
  parser: string | null;
  tx_count: number;
  uploaded_at: string;
};

export type BankTxRow = {
  id: string;
  bank_id: string;
  import_id: string | null;
  date: string;
  description: string;
  ref_no: string | null;
  debit: number;
  credit: number;
  balance: number | null;
  currency: string | null;
  source: string;
  created_at: string;
};

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Oturum bulunamadı");
  return id;
}

// ---------------- banks ----------------
export async function listBanks(): Promise<BankRow[]> {
  const { data, error } = await supabase
    .from("banks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as BankRow[]) ?? [];
}

export type BankInput = {
  name: string;
  logo_url?: string | null;
  iban?: string | null;
  account_name?: string | null;
  currency: string;
  description?: string | null;
};

export async function createBank(input: BankInput): Promise<BankRow> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("banks")
    .insert({ ...input, user_id })
    .select("*")
    .single();
  if (error) throw error;
  return data as BankRow;
}

export async function updateBank(id: string, patch: Partial<BankInput>): Promise<BankRow> {
  const { data, error } = await supabase
    .from("banks")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as BankRow;
}

export async function deleteBank(id: string): Promise<void> {
  const { error } = await supabase.from("banks").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- transactions ----------------
export type BankTxInput = {
  bank_id: string;
  import_id?: string | null;
  date: string;
  description: string;
  ref_no?: string | null;
  debit?: number;
  credit?: number;
  balance?: number | null;
  currency?: string | null;
  source?: string;
};

export async function listTransactions(bankId?: string | null): Promise<BankTxRow[]> {
  let q = supabase.from("bank_transactions").select("*").order("date", { ascending: false });
  if (bankId) q = q.eq("bank_id", bankId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as BankTxRow[]) ?? [];
}

export async function insertTransactions(rows: BankTxInput[]): Promise<number> {
  if (!rows.length) return 0;
  const user_id = await uid();
  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map((r) => ({
      ...r,
      debit: r.debit ?? 0,
      credit: r.credit ?? 0,
      source: r.source ?? "Manuel",
      user_id,
    }));
    // Ignore duplicate-key violations from the unique index.
    const { data, error } = await supabase
      .from("bank_transactions")
      .upsert(chunk, {
        onConflict: "user_id,bank_id,date,description,debit,credit,ref_no",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) throw error;
    inserted += data?.length ?? 0;
  }
  return inserted;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from("bank_transactions").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- imports ----------------
export async function listImports(): Promise<BankImportRow[]> {
  const { data, error } = await supabase
    .from("bank_imports")
    .select("*")
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return (data as BankImportRow[]) ?? [];
}

export type BankImportInput = {
  bank_id: string;
  file_name: string;
  file_type: string;
  parser?: string | null;
  tx_count: number;
};

export async function createImport(input: BankImportInput): Promise<BankImportRow> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("bank_imports")
    .insert({ ...input, user_id })
    .select("*")
    .single();
  if (error) throw error;
  return data as BankImportRow;
}

export async function deleteImport(id: string): Promise<void> {
  // Cascade delete removes linked transactions via FK ON DELETE CASCADE.
  const { error } = await supabase.from("bank_imports").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- logo helpers ----------------
export const MAX_LOGO_BYTES = 512 * 1024; // 512 KB

/** Read a File as data URL (base64) suitable for storage in banks.logo_url. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Dosya okunamadı"));
    reader.readAsDataURL(file);
  });
}
