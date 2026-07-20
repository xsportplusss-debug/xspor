import * as XLSX from "xlsx";
import type { Invoice, Product, BankTx } from "./mock-data";

export type Row = Record<string, any>;

export async function parseExcel(file: File): Promise<Row[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: "", raw: true });
}

export async function parsePdfLines(file: File): Promise<string[][]> {
  const pdfjs: any = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "";
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, disableWorker: true }).promise;
  const rows: string[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const lines = new Map<number, { x: number; s: string }[]>();
    for (const item of content.items as any[]) {
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push({ x, s: item.str });
    }
    const sorted = [...lines.entries()].sort((a, b) => b[0] - a[0]);
    for (const [, parts] of sorted) {
      parts.sort((a, b) => a.x - b.x);
      const cells = parts.map((p) => p.s.trim()).filter(Boolean);
      if (cells.length) rows.push(cells);
    }
  }
  return rows;
}

/** PDF sayfalarındaki satırları birleştirilmiş metin dizisi olarak döner. */
export async function parsePdfTextLines(file: File): Promise<string[]> {
  const rows = await parsePdfLines(file);
  return rows.map((r) => r.join(" ").replace(/\s+/g, " ").trim()).filter(Boolean);
}

const NUM = (v: any) => {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\s/g, "");
  const hasComma = s.includes(",");
  const cleaned = hasComma ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

const STR = (v: any) => (v == null ? "" : String(v).trim());

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DATE = (v: any): string => {
  if (!v && v !== 0) return "";
  if (v instanceof Date) return isoDate(v);
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? "" : isoDate(d);
  }
  const s = STR(v);
  const m = s.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) {
    const [, d, mo, y] = m;
    const yr = y.length === 2 ? "20" + y : y;
    return `${yr}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const iso = s.match(/^\d{4}-\d{2}-\d{2}/);
  return iso ? iso[0] : "";
};

/** Türkçe karakterleri sadeleştirir, İ→i, boşlukları normalize eder. */
const norm = (s: string) =>
  String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();

/** Uzun (spesifik) anahtar önce; başlıklarda substring araması. */
function pick(row: Row, keys: string[]): any {
  const rowKeys = Object.keys(row);
  const order = [...keys.map(norm)].sort((a, b) => b.length - a.length);
  for (const k of order) {
    for (const rk of rowKeys) {
      if (norm(rk).includes(k)) return row[rk];
    }
  }
  return "";
}

// ---------- Faturalar ----------
export function rowsToInvoices(rows: Row[]): Omit<Invoice, "id">[] {
  return rows.map((r) => {
    const no = STR(pick(r, ["fatura numarasi", "fatura no", "belge no", "invoice"]));
    const date = DATE(pick(r, ["tarih", "date"])) || new Date().toISOString().slice(0, 10);
    const party = STR(pick(r, ["firma", "musteri", "cari", "tedarikci", "unvan", "customer", "supplier"]));
    const subtotal = NUM(pick(r, ["fatura toplami (kdv haric)", "kdv haric", "ara toplam", "matrah"]));
    const vat = NUM(pick(r, ["kdv toplami", "kdv toplam", "kdv tutari"]));
    const discount = NUM(pick(r, ["fatura iskonto", "iskonto", "indirim", "discount"]));
    let total = NUM(pick(r, ["fatura genel toplami", "genel toplam", "grand total"]));
    if (!total) total = NUM(pick(r, ["toplam tutar", "toplam", "amount"]));
    if (!total) total = subtotal + vat - discount;
    return {
      no: no || `İMP-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      date, party, subtotal, vat, discount, total,
      status: "Onaylı" as const,
    };
  }).filter((x) => x.party || x.total);
}

export function linesToInvoices(lines: string[][]): Omit<Invoice, "id">[] {
  const out: Omit<Invoice, "id">[] = [];
  const dateRe = /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2}/;
  for (const line of lines) {
    const joined = line.join(" ");
    const dateMatch = joined.match(dateRe);
    const numMatch = joined.match(/[\d.,]+\s*(TL|₺)?\s*$/i);
    const amount = numMatch ? NUM(numMatch[0].replace(/[^\d.,]/g, "")) : 0;
    if (!dateMatch || !amount) continue;
    const party = joined.replace(dateRe, "").replace(/[\d.,]+\s*(TL|₺)?\s*$/i, "").trim().slice(0, 60);
    out.push({
      no: `İMP-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      date: DATE(dateMatch[0]),
      party: party || "—",
      total: amount,
      status: "Onaylı" as const,
    });
  }
  return out;
}

// ---------- Ürünler ----------
// Katalog Excel: picture1Path, label, brand, stockCode, barcode, mainCategory, price1, currency, tax
export function rowsToProducts(rows: Row[]): Omit<Product, "id">[] {
  return rows.map((r) => {
    const price1 = NUM(pick(r, ["price1", "toptan fiyat", "fiyat"]));
    const tax = NUM(pick(r, ["tax", "kdv orani", "kdv"])) || 20;
    const rawCur = STR(pick(r, ["currency", "para birimi", "doviz", "kur"])).toUpperCase();
    const currency: "TRY" | "USD" | "EUR" =
      rawCur.includes("USD") || rawCur.includes("$") || rawCur === "DOLAR" ? "USD" :
      rawCur.includes("EUR") || rawCur.includes("€") || rawCur === "EURO" ? "EUR" : "TRY";
    return {
      name: STR(pick(r, ["label", "urun adi", "ad", "name", "title"])),
      sku: STR(pick(r, ["stockcode", "stok kodu", "sku", "kod", "code"])),
      barcode: STR(pick(r, ["barcode", "barkod", "ean", "gtin"])),
      category: STR(pick(r, ["maincategory", "kategori", "category"])),
      brand: STR(pick(r, ["brand", "marka"])),
      image: STR(pick(r, ["picture1path", "resim", "image", "gorsel"])),
      price1, currency, tax,
      sell: +(price1 * (1 + tax / 100)).toFixed(2),
      buy: NUM(pick(r, ["buyingprice", "alis"])),
      vat: tax,
      stock: NUM(pick(r, ["stockamount", "stok"])),
      minStock: 0,
    };
  }).filter((p) => p.name || p.sku || p.barcode);
}

// ---------- Banka hareketleri ----------
// Desteklenen başlıklar: TARİH, ÖDEME YAPILAN FİRMA / AÇIKLAMA, GELEN / GİRİŞ / ALACAK,
// GİDEN / ÇIKIŞ / BORÇ, ÖZET / BAKİYE, TUTAR.
export function rowsToBankTx(rows: Row[], bankId: string): Omit<BankTx, "id">[] {
  return rows.map((r) => {
    const dep = NUM(pick(r, ["gelen", "giris", "alacak", "credit", "in"]));
    const wit = NUM(pick(r, ["giden", "cikis", "borc", "debit", "out"]));
    const combined = NUM(pick(r, ["tutar", "amount"]));
    const amount = (dep - wit) || combined;
    const balance = NUM(pick(r, ["bakiye", "balance", "ozet"]));
    const refNo = STR(pick(r, ["referans", "ref no", "ref", "islem no", "dekont no"]));
    const currency = STR(pick(r, ["doviz", "para birimi", "currency"])).toUpperCase() || undefined;
    return {
      bankId,
      date: DATE(pick(r, ["tarih", "date"])) || new Date().toISOString().slice(0, 10),
      description:
        STR(pick(r, ["dekont aciklamasi", "odeme yapilan firma", "aciklama", "desc", "description", "firma"])) ||
        "İçe aktarıldı",
      category: STR(pick(r, ["kategori", "category"])) || undefined,
      amount,
      debit: wit || undefined,
      credit: dep || undefined,
      balance: balance || undefined,
      refNo: refNo || undefined,
      currency,
      source: "Excel" as const,
      status: "Yeni" as const,
    };
  }).filter((x) => x.amount);
}

/** Esnek başlık tespiti: ilk 20 satırda başlığı bulmayı dener. */
export async function parseBankExcelStatement(
  file: File,
  bankId: string,
): Promise<{ txs: Omit<BankTx, "id">[]; parser: string }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
  const keywords = ["tarih", "date", "aciklama", "description", "borc", "alacak", "tutar", "bakiye"];
  let headerIdx = -1;
  for (let i = 0; i < Math.min(aoa.length, 25); i++) {
    const row = aoa[i].map((c) => norm(String(c || "")));
    const hit = row.filter((c) => keywords.some((k) => c.includes(k))).length;
    if (hit >= 2) { headerIdx = i; break; }
  }
  if (headerIdx < 0) {
    // Fallback: header'ı XLSX'e bulur
    const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "", raw: true });
    return { txs: rowsToBankTx(rows, bankId), parser: "Excel (otomatik)" };
  }
  const headers = aoa[headerIdx].map((c) => String(c || ""));
  const rows: Row[] = [];
  for (let i = headerIdx + 1; i < aoa.length; i++) {
    const arr = aoa[i];
    if (!arr || arr.every((c) => c === "" || c == null)) continue;
    const r: Row = {};
    headers.forEach((h, j) => { r[h] = arr[j]; });
    rows.push(r);
  }
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const parser = ext === "csv" ? "CSV (otomatik)" : "Excel (otomatik)";
  const txs = rowsToBankTx(rows, bankId).map((t) => ({
    ...t,
    source: (ext === "csv" ? "CSV" : "Excel") as "CSV" | "Excel",
  }));
  return { txs, parser };
}

export function linesToBankTx(lines: string[][], bankId: string): Omit<BankTx, "id">[] {
  const dateRe = /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2}/;
  const out: Omit<BankTx, "id">[] = [];
  for (const line of lines) {
    const joined = line.join(" ");
    const dateMatch = joined.match(dateRe);
    if (!dateMatch) continue;
    const numMatch = joined.match(/-?[\d.,]+\s*(TL|₺)?\s*$/i);
    if (!numMatch) continue;
    const raw = numMatch[0].replace(/[^\d.,-]/g, "");
    const amount = (raw.startsWith("-") ? -1 : 1) * NUM(raw.replace("-", ""));
    if (!amount) continue;
    const desc = joined.replace(dateRe, "").replace(/-?[\d.,]+\s*(TL|₺)?\s*$/i, "").trim().slice(0, 80);
    out.push({ bankId, date: DATE(dateMatch[0]), description: desc || "—", amount, source: "PDF", status: "Yeni" });
  }
  return out;
}

export function downloadTemplate(name: string, headers: string[], sample: any[][] = []) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  XLSX.utils.book_append_sheet(wb, ws, "Şablon");
  XLSX.writeFile(wb, name);
}

export const INVOICE_TEMPLATE_HEADERS = [
  "FATURA NUMARASI",
  "TARİH",
  "FİRMA",
  "FATURA TOPLAMI (KDV HARİÇ)",
  "KDV TOPLAMI (%10-20)",
  "FATURA İSKONTO",
  "FATURA GENEL TOPLAMI",
];

export const PRODUCT_TEMPLATE_HEADERS = [
  "picture1Path", "label", "brand", "stockCode", "barcode", "mainCategory", "price1", "currency", "tax",
];
