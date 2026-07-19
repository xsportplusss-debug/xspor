// E-Fatura Servisi (mock adapter)
// Gerçek entegrasyon için `fetchInvoicesFromApi` içine gerçek API çağrısı eklenebilir.
// GİB / Foriba / Nes / Uyumsoft vb. entegratörlere göre `provider` parametresine
// bakılarak farklı adapter'lar seçilebilir.

import type { EInvoiceConfig } from "@/lib/store";
import type { Invoice } from "@/lib/mock-data";

export type EInvoiceFetchResult = {
  sales: Omit<Invoice, "id">[];
  purchase: Omit<Invoice, "id">[];
};

export async function testConnection(cfg: EInvoiceConfig): Promise<{ ok: boolean; message: string }> {
  await new Promise((r) => setTimeout(r, 700));
  if (!cfg.apiUrl || !cfg.username || !cfg.password) {
    return { ok: false, message: "API URL, kullanıcı adı ve şifre gereklidir" };
  }
  // Şimdilik mock: bilgiler girilmişse bağlantı başarılı sayılır.
  return { ok: true, message: `Bağlantı başarılı — ${cfg.provider || "GİB"}` };
}

export async function fetchInvoices(cfg: EInvoiceConfig): Promise<EInvoiceFetchResult> {
  await new Promise((r) => setTimeout(r, 900));
  // Gerçek API cevabı henüz bağlanmadı — boş liste döner.
  // Kullanıcı gerçek API bilgilerini girip endpoint'i tanımladığında burada
  // fetch(cfg.apiUrl + "/invoices", { headers: { Authorization: `Bearer ${cfg.token}` } })
  // gibi bir çağrı yapılacak.
  void cfg;
  return { sales: [], purchase: [] };
}
