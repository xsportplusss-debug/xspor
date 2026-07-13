// Ortak mock veri — sadece frontend gösterim amaçlı
export type Invoice = {
  id: string;
  no: string;
  date: string;
  party: string;
  status: "Onaylı" | "Taslak" | "İptal";
  payment: "Tahsil Edildi" | "Kısmi" | "Bekliyor";
  total: number;
};

export const salesInvoices: Invoice[] = [
  { id: "1", no: "SF2026-0142", date: "2026-07-12", party: "Yıldız Tekstil A.Ş.", status: "Onaylı", payment: "Tahsil Edildi", total: 24850.5 },
  { id: "2", no: "SF2026-0141", date: "2026-07-11", party: "Mavi Deniz Ltd.", status: "Onaylı", payment: "Kısmi", total: 12450 },
  { id: "3", no: "SF2026-0140", date: "2026-07-10", party: "Anadolu Yapı", status: "Onaylı", payment: "Bekliyor", total: 87320 },
  { id: "4", no: "SF2026-0139", date: "2026-07-10", party: "Ege Gıda", status: "Taslak", payment: "Bekliyor", total: 4560 },
  { id: "5", no: "SF2026-0138", date: "2026-07-09", party: "Karadeniz Metal", status: "Onaylı", payment: "Tahsil Edildi", total: 156700 },
  { id: "6", no: "SF2026-0137", date: "2026-07-08", party: "Beyaz Kimya", status: "İptal", payment: "Bekliyor", total: 8900 },
  { id: "7", no: "SF2026-0136", date: "2026-07-08", party: "Marmara Lojistik", status: "Onaylı", payment: "Tahsil Edildi", total: 32100 },
  { id: "8", no: "SF2026-0135", date: "2026-07-07", party: "Akdeniz Turizm", status: "Onaylı", payment: "Kısmi", total: 45600 },
];

export const purchaseInvoices: Invoice[] = [
  { id: "1", no: "AF2026-0088", date: "2026-07-11", party: "Global Elektronik", status: "Onaylı", payment: "Tahsil Edildi", total: 68900 },
  { id: "2", no: "AF2026-0087", date: "2026-07-10", party: "Star Ambalaj", status: "Onaylı", payment: "Bekliyor", total: 12300 },
  { id: "3", no: "AF2026-0086", date: "2026-07-09", party: "Nova Kırtasiye", status: "Onaylı", payment: "Kısmi", total: 3450 },
  { id: "4", no: "AF2026-0085", date: "2026-07-08", party: "Titan Yedek Parça", status: "Taslak", payment: "Bekliyor", total: 24500 },
  { id: "5", no: "AF2026-0084", date: "2026-07-07", party: "Mercan Tekstil", status: "Onaylı", payment: "Tahsil Edildi", total: 87600 },
];

export type Cari = {
  id: string;
  code: string;
  title: string;
  phone: string;
  taxNo: string;
  balance: number; // + alacak, - borç
  status: "Aktif" | "Pasif";
  type: "Müşteri" | "Tedarikçi";
};

export const cariList: Cari[] = [
  { id: "1", code: "M0001", title: "Yıldız Tekstil A.Ş.", phone: "0212 555 12 34", taxNo: "1234567890", balance: 45600, status: "Aktif", type: "Müşteri" },
  { id: "2", code: "M0002", title: "Mavi Deniz Ltd.", phone: "0216 444 22 11", taxNo: "2345678901", balance: 12300, status: "Aktif", type: "Müşteri" },
  { id: "3", code: "T0001", title: "Global Elektronik", phone: "0312 333 55 66", taxNo: "3456789012", balance: -87500, status: "Aktif", type: "Tedarikçi" },
  { id: "4", code: "M0003", title: "Anadolu Yapı", phone: "0224 222 44 77", taxNo: "4567890123", balance: 156800, status: "Aktif", type: "Müşteri" },
  { id: "5", code: "T0002", title: "Star Ambalaj", phone: "0232 111 66 88", taxNo: "5678901234", balance: -24500, status: "Aktif", type: "Tedarikçi" },
  { id: "6", code: "M0004", title: "Karadeniz Metal", phone: "0362 999 33 22", taxNo: "6789012345", balance: 0, status: "Pasif", type: "Müşteri" },
];

export type Product = {
  id: string;
  barcode: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  buy: number;
  sell: number;
  vat: number;
  stock: number;
  minStock: number;
};

export const products: Product[] = [
  { id: "1", barcode: "8690123456789", sku: "ELK-001", name: "Kablosuz Kulaklık Pro", category: "Elektronik", brand: "SoundX", buy: 850, sell: 1499, vat: 20, stock: 42, minStock: 10 },
  { id: "2", barcode: "8690123456790", sku: "GDA-014", name: "Organik Zeytinyağı 1L", category: "Gıda", brand: "Ege", buy: 180, sell: 289, vat: 10, stock: 8, minStock: 20 },
  { id: "3", barcode: "8690123456791", sku: "TXT-088", name: "Pamuklu T-Shirt", category: "Tekstil", brand: "Basic", buy: 65, sell: 149, vat: 20, stock: 320, minStock: 50 },
  { id: "4", barcode: "8690123456792", sku: "OFS-022", name: "A4 Fotokopi Kağıdı", category: "Kırtasiye", brand: "Nova", buy: 95, sell: 145, vat: 20, stock: 5, minStock: 15 },
  { id: "5", barcode: "8690123456793", sku: "ELK-045", name: "USB-C Hızlı Şarj Kablosu", category: "Elektronik", brand: "TechLine", buy: 45, sell: 99, vat: 20, stock: 178, minStock: 30 },
  { id: "6", barcode: "8690123456794", sku: "KOZ-005", name: "Doğal Sabun 100g", category: "Kozmetik", brand: "Pure", buy: 22, sell: 55, vat: 20, stock: 96, minStock: 25 },
];

export const banks = [
  { id: "1", name: "Garanti BBVA", short: "GAR", iban: "TR33 0006 2000 0001 2345 6789 01", balance: 458720.55, color: "#00A651" },
  { id: "2", name: "İş Bankası", short: "İŞB", iban: "TR64 0064 0000 0011 2345 6789 02", balance: 128450.2, color: "#0055A4" },
  { id: "3", name: "Yapı Kredi", short: "YKB", iban: "TR21 0067 1000 0002 2345 6789 03", balance: 89320.4, color: "#004990" },
  { id: "4", name: "Ziraat Bankası", short: "ZRT", iban: "TR11 0001 0000 0009 8765 4321 00", balance: 245680.9, color: "#E30613" },
];

export const cashRegisters = [
  { id: "1", currency: "TL", balance: 45820.55, symbol: "₺" },
  { id: "2", currency: "USD", balance: 12400, symbol: "$" },
  { id: "3", currency: "EUR", balance: 8750, symbol: "€" },
];

export const marketplaces = [
  { id: "trendyol", name: "Trendyol", orders: 128, pending: 12, returns: 4, commission: 18420, net: 89320, color: "#F27A1A" },
  { id: "hepsiburada", name: "Hepsiburada", orders: 84, pending: 8, returns: 2, commission: 11250, net: 56780, color: "#FF6000" },
  { id: "amazon", name: "Amazon", orders: 52, pending: 5, returns: 1, commission: 8940, net: 42100, color: "#FF9900" },
  { id: "n11", name: "N11", orders: 36, pending: 3, returns: 1, commission: 4820, net: 21500, color: "#F5A623" },
  { id: "pazarama", name: "Pazarama", orders: 18, pending: 2, returns: 0, commission: 1980, net: 9820, color: "#7B2CBF" },
];

export const salesChart = [
  { m: "Oca", satis: 145000, alis: 98000 },
  { m: "Şub", satis: 168000, alis: 112000 },
  { m: "Mar", satis: 189000, alis: 128000 },
  { m: "Nis", satis: 172000, alis: 134000 },
  { m: "May", satis: 215000, alis: 145000 },
  { m: "Haz", satis: 248000, alis: 162000 },
  { m: "Tem", satis: 232000, alis: 158000 },
];

export const incomeExpenseChart = [
  { m: "Oca", gelir: 145000, gider: 98000 },
  { m: "Şub", gelir: 168000, gider: 112000 },
  { m: "Mar", gelir: 189000, gider: 128000 },
  { m: "Nis", gelir: 172000, gider: 134000 },
  { m: "May", gelir: 215000, gider: 145000 },
  { m: "Haz", gelir: 248000, gider: 162000 },
  { m: "Tem", gelir: 232000, gider: 158000 },
];

export const categories = [
  { id: "1", name: "Elektronik", products: 128, color: "chart-1" },
  { id: "2", name: "Gıda", products: 84, color: "chart-2" },
  { id: "3", name: "Tekstil", products: 212, color: "chart-3" },
  { id: "4", name: "Kırtasiye", products: 56, color: "chart-4" },
  { id: "5", name: "Kozmetik", products: 42, color: "chart-5" },
];

export const stockMovements = [
  { id: "1", date: "2026-07-12", product: "Kablosuz Kulaklık Pro", type: "Giriş", qty: 20, ref: "AF2026-0088" },
  { id: "2", date: "2026-07-12", product: "Pamuklu T-Shirt", type: "Çıkış", qty: 15, ref: "SF2026-0142" },
  { id: "3", date: "2026-07-11", product: "USB-C Şarj Kablosu", type: "Çıkış", qty: 40, ref: "SF2026-0141" },
  { id: "4", date: "2026-07-11", product: "Organik Zeytinyağı", type: "Giriş", qty: 50, ref: "AF2026-0087" },
  { id: "5", date: "2026-07-10", product: "Doğal Sabun", type: "Çıkış", qty: 24, ref: "SF2026-0140" },
];

export const incomes = [
  { id: "1", date: "2026-07-12", category: "Satış Geliri", amount: 24850, desc: "Yıldız Tekstil satış" },
  { id: "2", date: "2026-07-11", category: "Kira Geliri", amount: 15000, desc: "Depo kira geliri" },
  { id: "3", date: "2026-07-10", category: "Faiz Geliri", amount: 3420, desc: "Vadeli hesap faizi" },
];

export const expenses = [
  { id: "1", date: "2026-07-12", category: "Kira", amount: 25000, desc: "Ofis kira ödemesi" },
  { id: "2", date: "2026-07-11", category: "Elektrik", amount: 4820, desc: "Temmuz faturası" },
  { id: "3", date: "2026-07-10", category: "Personel", amount: 148000, desc: "Maaş ödemeleri" },
  { id: "4", date: "2026-07-08", category: "Yakıt", amount: 6200, desc: "Filo yakıt gideri" },
];

export const notifications = [
  { id: "1", title: "Yeni Sipariş", desc: "Trendyol'dan 3 yeni sipariş geldi.", time: "5 dk önce", type: "info" as const },
  { id: "2", title: "Düşük Stok Uyarısı", desc: "A4 Fotokopi Kağıdı stoku minimumun altında.", time: "1 sa önce", type: "warning" as const },
  { id: "3", title: "Tahsilat", desc: "Yıldız Tekstil ödemesi hesabınıza geçti.", time: "3 sa önce", type: "success" as const },
  { id: "4", title: "Yaklaşan Ödeme", desc: "Global Elektronik ödemesi 2 gün içinde vadesi doluyor.", time: "Bugün", type: "warning" as const },
];

export const users = [
  { id: "1", name: "Ahmet Yılmaz", email: "ahmet@firma.com", role: "Yönetici", status: "Aktif" },
  { id: "2", name: "Ayşe Kaya", email: "ayse@firma.com", role: "Muhasebe", status: "Aktif" },
  { id: "3", name: "Mehmet Demir", email: "mehmet@firma.com", role: "Satış", status: "Aktif" },
  { id: "4", name: "Zeynep Şahin", email: "zeynep@firma.com", role: "Depo", status: "Pasif" },
];

export const fmtTL = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n);

export const fmt = (n: number, cur = "TRY") =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(n);
