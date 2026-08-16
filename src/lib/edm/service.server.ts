/** EDM entegrasyon iş mantığı (yalnızca sunucu tarafı). */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { decryptSecret, encryptSecret } from "./crypto.server";
import { EdmError, edmFetchInvoiceUbl, edmFetchInvoices, edmLogin, type EdmInvoice } from "./client.server";

const PROVIDER = "EDM";
const SESSION_TTL_MIN = 20;

export type EdmSettingsInput = {
  api_url: string;
  environment: string;
  username: string;
  password?: string | null;
  vkn_tckn?: string | null;
  company_name?: string | null;
  gb_label?: string | null;
  pk_label?: string | null;
  company_code?: string | null;
  token?: string | null;
};

export type EdmSettingsPublic = {
  api_url: string;
  environment: string;
  username: string;
  vkn_tckn: string | null;
  company_name: string | null;
  gb_label: string | null;
  pk_label: string | null;
  company_code: string | null;
  has_password: boolean;
  has_token: boolean;
  last_sync_at: string | null;
  connection_status: string;
  last_error: string | null;
};

type Row = {
  id: string;
  api_url: string;
  environment: string;
  username: string;
  encrypted_password: string | null;
  vkn_tckn: string | null;
  company_name: string | null;
  gb_label: string | null;
  pk_label: string | null;
  company_code: string | null;
  token: string | null;
  session_id: string | null;
  session_expires_at: string | null;
  last_sync_at: string | null;
  connection_status: string;
  last_error: string | null;
};

async function loadRow(userId: string): Promise<Row | null> {
  const { data, error } = await supabaseAdmin
    .from("integration_settings")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", PROVIDER)
    .maybeSingle();
  if (error) throw new EdmError("DB", `Ayarlar okunamadı: ${error.message}`);
  return (data as Row | null) ?? null;
}

export function toPublic(row: Row | null): EdmSettingsPublic | null {
  if (!row) return null;
  return {
    api_url: row.api_url,
    environment: row.environment,
    username: row.username,
    vkn_tckn: row.vkn_tckn,
    company_name: row.company_name,
    gb_label: row.gb_label,
    pk_label: row.pk_label,
    company_code: row.company_code,
    has_password: !!row.encrypted_password,
    has_token: !!row.token,
    last_sync_at: row.last_sync_at,
    connection_status: row.connection_status,
    last_error: row.last_error,
  };
}

export async function getSettings(userId: string) {
  return toPublic(await loadRow(userId));
}

export async function saveSettings(userId: string, input: EdmSettingsInput) {
  const existing = await loadRow(userId);
  const encrypted_password = input.password
    ? await encryptSecret(input.password)
    : (existing?.encrypted_password ?? null);

  const payload = {
    user_id: userId,
    provider: PROVIDER,
    api_url: input.api_url.trim(),
    environment: input.environment,
    username: input.username.trim(),
    encrypted_password,
    vkn_tckn: input.vkn_tckn ?? null,
    company_name: input.company_name ?? null,
    gb_label: input.gb_label ?? null,
    pk_label: input.pk_label ?? null,
    company_code: input.company_code ?? null,
    token: input.token ?? null,
  };

  const { error } = await supabaseAdmin
    .from("integration_settings")
    .upsert(payload, { onConflict: "user_id,provider" });
  if (error) throw new EdmError("DB", `Ayarlar kaydedilemedi: ${error.message}`);
  return toPublic(await loadRow(userId));
}

type StatusPatch = {
  session_id?: string | null;
  session_expires_at?: string | null;
  connection_status?: string;
  last_error?: string | null;
  last_sync_at?: string | null;
};

async function setStatus(userId: string, patch: StatusPatch) {
  await supabaseAdmin
    .from("integration_settings")
    .update(patch)
    .eq("user_id", userId)
    .eq("provider", PROVIDER);
}

/** Geçerli SESSION_ID döner; yoksa/expire olduysa otomatik yeniden login yapar. */
async function ensureSession(userId: string, forceNew = false): Promise<{ row: Row; sessionId: string }> {
  const row = await loadRow(userId);
  if (!row) throw new EdmError("MISSING", "Önce EDM bağlantı bilgilerini kaydedin.");
  if (!row.api_url) throw new EdmError("MISSING", "EDM Web Service adresi girilmemiş.");

  const stillValid =
    !forceNew &&
    row.session_id &&
    row.session_expires_at &&
    new Date(row.session_expires_at).getTime() > Date.now() + 60_000;
  if (stillValid) return { row, sessionId: row.session_id! };

  const password = await decryptSecret(row.encrypted_password);
  if (!password) throw new EdmError("MISSING", "EDM şifresi kayıtlı değil.");
  const sessionId = await edmLogin(row.api_url, row.username, password);
  const expires = new Date(Date.now() + SESSION_TTL_MIN * 60_000).toISOString();
  await setStatus(userId, {
    session_id: sessionId,
    session_expires_at: expires,
    connection_status: "connected",
    last_error: null,
  });
  return { row, sessionId };
}

export async function testConnection(userId: string) {
  try {
    await ensureSession(userId, true);
    return { ok: true as const, message: "EDM bağlantısı başarılı." };
  } catch (e) {
    const err = e instanceof EdmError ? e : new EdmError("UNKNOWN", "Beklenmeyen bir hata oluştu.");
    console.error("[EDM] test connection failed", e);
    await setStatus(userId, { connection_status: "error", last_error: err.message });
    return { ok: false as const, message: err.message, code: err.code };
  }
}

export type SyncResult = {
  direction: "IN" | "OUT";
  fetched: number;
  inserted: number;
  existing: number;
  failed: number;
  lastSyncAt: string | null;
  message?: string;
};

function num(v: number) {
  return Number.isFinite(v) ? v : 0;
}

async function persistInvoice(userId: string, inv: EdmInvoice): Promise<"inserted" | "existing" | "failed"> {
  try {
    const { data: found } = await supabaseAdmin
      .from("edm_invoices")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", PROVIDER)
      .eq("invoice_uuid", inv.invoice_uuid)
      .maybeSingle();
    if (found) return "existing";

    const { data: inserted, error } = await supabaseAdmin
      .from("edm_invoices")
      .insert({
        user_id: userId,
        provider: PROVIDER,
        invoice_uuid: inv.invoice_uuid,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        invoice_type: inv.invoice_type,
        scenario: inv.scenario,
        direction: inv.direction,
        seller_vkn: inv.seller_vkn,
        seller_name: inv.seller_name,
        buyer_vkn: inv.buyer_vkn,
        buyer_name: inv.buyer_name,
        tax_office: inv.tax_office,
        currency: inv.currency,
        line_extension_amount: num(inv.line_extension_amount),
        discount_amount: num(inv.discount_amount),
        tax_base: num(inv.tax_base),
        tax_total: num(inv.tax_total),
        grand_total: num(inv.grand_total),
        payable_amount: num(inv.payable_amount || inv.grand_total),
        status: inv.status,
        gib_status_code: inv.gib_status_code,
        gib_status_desc: inv.gib_status_desc,
        edm_status: inv.edm_status,
        ubl_xml: inv.ubl_xml,
        issued_at: inv.issued_at ? new Date(inv.issued_at).toISOString() : null,
      })
      .select("id")
      .single();

    if (error) {
      // Unique constraint → aynı fatura zaten kayıtlı
      if (error.code === "23505") return "existing";
      console.error("[EDM] invoice insert failed", inv.invoice_uuid, error);
      return "failed";
    }

    if (inv.lines.length) {
      const { error: lineErr } = await supabaseAdmin.from("edm_invoice_lines").insert(
        inv.lines.map((l, i) => ({
          user_id: userId,
          invoice_id: inserted!.id,
          line_no: l.line_no || i + 1,
          name: l.name,
          code: l.code,
          quantity: num(l.quantity),
          unit: l.unit,
          unit_price: num(l.unit_price),
          discount: num(l.discount),
          vat_rate: num(l.vat_rate),
          vat_amount: num(l.vat_amount),
          line_total: num(l.line_total),
          currency: l.currency,
        })),
      );
      if (lineErr) console.error("[EDM] line insert failed", inv.invoice_uuid, lineErr);
    }
    return "inserted";
  } catch (e) {
    console.error("[EDM] persist error", inv.invoice_uuid, e);
    return "failed";
  }
}

export async function syncInvoices(
  userId: string,
  opts: { direction: "IN" | "OUT"; startDate?: string; endDate?: string; sinceLastSync?: boolean },
): Promise<SyncResult> {
  const base: SyncResult = {
    direction: opts.direction,
    fetched: 0,
    inserted: 0,
    existing: 0,
    failed: 0,
    lastSyncAt: null,
  };
  try {
    let { row, sessionId } = await ensureSession(userId);

    const endDate = opts.endDate ?? new Date().toISOString().slice(0, 10);
    const startDate =
      opts.sinceLastSync && row.last_sync_at
        ? row.last_sync_at.slice(0, 10)
        : (opts.startDate ??
          new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10));

    if (startDate > endDate) {
      throw new EdmError("DATE_RANGE", "Başlangıç tarihi bitiş tarihinden sonra olamaz.");
    }

    let invoices: EdmInvoice[];
    try {
      invoices = await edmFetchInvoices({ url: row.api_url, sessionId, direction: opts.direction, startDate, endDate });
    } catch (e) {
      if (e instanceof EdmError && e.code === "SESSION") {
        ({ row, sessionId } = await ensureSession(userId, true));
        invoices = await edmFetchInvoices({ url: row.api_url, sessionId, direction: opts.direction, startDate, endDate });
      } else throw e;
    }

    base.fetched = invoices.length;
    for (const inv of invoices) {
      if (!inv.ubl_xml) {
        inv.ubl_xml = await edmFetchInvoiceUbl({ url: row.api_url, sessionId, uuid: inv.invoice_uuid });
      }
      const r = await persistInvoice(userId, inv);
      base[r === "inserted" ? "inserted" : r === "existing" ? "existing" : "failed"]++;
    }

    const now = new Date().toISOString();
    await setStatus(userId, { last_sync_at: now, connection_status: "connected", last_error: null });
    base.lastSyncAt = now;
    return base;
  } catch (e) {
    const err = e instanceof EdmError ? e : new EdmError("UNKNOWN", "Beklenmeyen bir hata oluştu.");
    console.error("[EDM] sync failed", e);
    await setStatus(userId, { connection_status: "error", last_error: err.message });
    return { ...base, message: err.message };
  }
}

export type EdmInvoiceRow = {
  id: string;
  invoice_uuid: string;
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_type: string | null;
  scenario: string | null;
  direction: string;
  seller_name: string | null;
  seller_vkn: string | null;
  buyer_name: string | null;
  buyer_vkn: string | null;
  currency: string;
  line_extension_amount: number;
  discount_amount: number;
  tax_total: number;
  grand_total: number;
  payable_amount: number;
  status: string | null;
  gib_status_desc: string | null;
};

export async function listInvoices(userId: string, direction: "IN" | "OUT"): Promise<EdmInvoiceRow[]> {
  const { data, error } = await supabaseAdmin
    .from("edm_invoices")
    .select(
      "id, invoice_uuid, invoice_number, invoice_date, invoice_type, scenario, direction, seller_name, seller_vkn, buyer_name, buyer_vkn, currency, line_extension_amount, discount_amount, tax_total, grand_total, payable_amount, status, gib_status_desc",
    )
    .eq("user_id", userId)
    .eq("direction", direction)
    .order("invoice_date", { ascending: false });
  if (error) throw new EdmError("DB", error.message);
  return (data ?? []) as EdmInvoiceRow[];
}

export async function invoiceDetail(userId: string, id: string) {
  const { data, error } = await supabaseAdmin
    .from("edm_invoices")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new EdmError("DB", error.message);
  if (!data) return null;
  const { data: lines } = await supabaseAdmin
    .from("edm_invoice_lines")
    .select("*")
    .eq("invoice_id", id)
    .order("line_no");
  return { invoice: data, lines: lines ?? [] };
}
