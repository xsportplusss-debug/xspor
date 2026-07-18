// Örnek veriler kaldırıldı. Bu dosya yalnızca tip ve format yardımcılarını
// dışa aktarır. Tüm koleksiyonlar `src/lib/store.ts` altında Zustand ile
// yönetilir ve tarayıcıda `localStorage`'a kalıcılaştırılır.

export type InvoiceStatus =
  | "Onaylı" | "Taslak" | "İptal"
  | "Tahsil Edildi" | "Ödeme Bekleniyor"
  | "Ödendi" | "Ödeme Yapılacak";

export type Invoice = {
  id: string;
  no: string;
  date: string;
  party: string;
  status: InvoiceStatus;
  payment?: "Tahsil Edildi" | "Kısmi" | "Bekliyor";
  total: number;
  subtotal?: number;
  vat?: number;
  discount?: number;
};

export type Cari = {
  id: string;
  code: string;
  title: string;
  phone: string;
  taxNo: string;
  balance: number;
  status: "Aktif" | "Pasif";
  type: "Müşteri" | "Tedarikçi";
};

export type Currency = "TRY" | "USD" | "EUR";

export type Product = {
  id: string;
  barcode: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  image?: string;
  price1: number;         // Toptan fiyat (döviz ise currency cinsinden)
  currency: Currency;     // price1 birimi
  tax: number;            // KDV %
  buy: number;
  sell: number;
  vat: number;
  stock: number;
  minStock: number;
};

export type Bank = {
  id: string;
  name: string;
  short: string;
  iban: string;
  currency: string;
  balance: number; // açılış bakiyesi
  color: string;
};

export type BankTx = {
  id: string;
  bankId: string;
  date: string;
  description: string;
  category?: string;
  amount: number; // + giriş, - çıkış
};

export type CashRegister = {
  id: string;
  name: string;
  currency: string;
  balance: number; // açılış
};

export type CashTx = {
  id: string;
  cashId: string;
  date: string;
  description: string;
  category?: string;
  amount: number; // + giriş, - çıkış
};

export type Category = { id: string; name: string; products?: number };

// Pazaryerleri, bildirimler ve kullanıcılar demo amaçlı boş listeler.
export const marketplaces: {
  id: string; name: string; orders: number; pending: number; returns: number;
  commission: number; net: number; color: string;
}[] = [];

export const notifications: { id: string; title: string; desc: string; time: string; type: "info" | "warning" | "success" }[] = [];

export const users: { id: string; name: string; email: string; role: string; status: string }[] = [];

export const fmtTL = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n);

export const fmt = (n: number, cur = "TRY") =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(n);
