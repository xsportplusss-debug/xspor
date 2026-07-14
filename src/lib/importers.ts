import * as XLSX from "xlsx";

export type Row = Record<string, string | number>;

export async function parseExcel(file: File): Promise<Row[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });
}

/** Basit tabular PDF çıkarımı — her sayfadaki metin satırlarını dize dizisine çevirir. */
export async function parsePdfLines(file: File): Promise<string[][]> {
  const pdfjs: any = await import("pdfjs-dist");
  // worker'ı devre dışı bırak (küçük dosyalar için yeterli)
  pdfjs.GlobalWorkerOptions.workerSrc = "";
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, disableWorker: true }).promise;
  const rows: string[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Satırları y koordinatına göre grupla
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

export type XmlProduct = { name: string; sku: string; barcode: string; category: string };

/** XML metninden ürün listesi çıkarır. `<Urun>`, `<product>`, `<item>` vs. destekler. */
export function parseProductXml(xmlText: string): XmlProduct[] {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error("XML çözümlenemedi: " + err.textContent);

  const productTags = ["Urun", "Ürün", "urun", "product", "Product", "item", "Item", "Row"];
  let nodes: Element[] = [];
  for (const t of productTags) {
    const list = doc.getElementsByTagName(t);
    if (list.length) { nodes = Array.from(list); break; }
  }
  if (!nodes.length) {
    // root'un doğrudan çocukları
    nodes = Array.from(doc.documentElement.children);
  }

  const pick = (el: Element, keys: string[]) => {
    for (const k of keys) {
      const found = el.getElementsByTagName(k)[0];
      if (found?.textContent?.trim()) return found.textContent.trim();
    }
    return "";
  };

  const nameKeys = ["UrunAdi", "urun_adi", "urunAdi", "ProductName", "product_name", "name", "Name", "Baslik", "title"];
  const skuKeys = ["StokKodu", "stok_kodu", "stokKodu", "SKU", "sku", "Kod", "code", "ProductCode", "productCode"];
  const barcodeKeys = ["Barkod", "barkod", "Barcode", "barcode", "EAN", "ean", "GTIN", "gtin"];
  const catKeys = ["Kategori", "kategori", "Category", "category", "CategoryName"];

  return nodes.map((el) => ({
    name: pick(el, nameKeys),
    sku: pick(el, skuKeys),
    barcode: pick(el, barcodeKeys),
    category: pick(el, catKeys),
  })).filter((p) => p.name || p.sku || p.barcode);
}

/** URL'den XML metni çeker (CORS başarısız olursa fırlatır). */
export async function fetchXml(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("İstek başarısız: " + res.status);
  return await res.text();
}

// Ortak fatura satırı çıkarımı: rastgele alan isimleriyle Excel için
const NUM = (v: any) => {
  if (typeof v === "number") return v;
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

const STR = (v: any) => (v == null ? "" : String(v).trim());

const pickField = (row: Row, keys: string[]): any => {
  for (const k of Object.keys(row)) {
    if (keys.some((x) => k.toLowerCase().includes(x))) return row[k];
  }
  return "";
};

export function rowsToInvoices(rows: Row[]): Omit<import("./mock-data").Invoice, "id">[] {
  return rows.map((r) => ({
    no: STR(pickField(r, ["fatura no", "no", "belge", "invoice"])) || `İMP-${Math.random().toString(36).slice(2, 6)}`,
    date: STR(pickField(r, ["tarih", "date"])) || new Date().toISOString().slice(0, 10),
    party: STR(pickField(r, ["müşteri", "musteri", "cari", "tedarikçi", "tedarikci", "unvan", "party", "customer", "supplier"])),
    total: NUM(pickField(r, ["toplam", "tutar", "total", "amount"])),
    status: "Onaylı" as const,
    payment: "Bekliyor" as const,
  })).filter((x) => x.party || x.total);
}

export function linesToInvoices(lines: string[][]): Omit<import("./mock-data").Invoice, "id">[] {
  // PDF: her satırdan tarih + son sayısal alanı yakala
  const out: Omit<import("./mock-data").Invoice, "id">[] = [];
  const dateRe = /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2}/;
  for (const line of lines) {
    const joined = line.join(" ");
    const dateMatch = joined.match(dateRe);
    const numMatch = joined.match(/[\d.,]+\s*(TL|₺)?\s*$/i);
    const amount = numMatch ? NUM(numMatch[0].replace(/[^\d.,]/g, "")) : 0;
    if (!dateMatch || !amount) continue;
    const party = joined.replace(dateRe, "").replace(/[\d.,]+\s*(TL|₺)?\s*$/i, "").trim().slice(0, 60);
    out.push({
      no: `İMP-${Math.random().toString(36).slice(2, 6)}`,
      date: dateMatch[0],
      party: party || "—",
      total: amount,
      status: "Onaylı" as const,
      payment: "Bekliyor" as const,
    });
  }
  return out;
}

export function rowsToBankTx(rows: Row[], bankId: string): Omit<import("./mock-data").BankTx, "id">[] {
  return rows.map((r) => {
    const dep = NUM(pickField(r, ["giriş", "giris", "alacak", "credit", "in"]));
    const wit = NUM(pickField(r, ["çıkış", "cikis", "borç", "borc", "debit", "out"]));
    const combined = NUM(pickField(r, ["tutar", "amount"]));
    const amount = dep - wit || combined;
    return {
      bankId,
      date: STR(pickField(r, ["tarih", "date"])) || new Date().toISOString().slice(0, 10),
      description: STR(pickField(r, ["açıklama", "aciklama", "desc", "description"])) || "İçe aktarıldı",
      category: STR(pickField(r, ["kategori", "category"])) || undefined,
      amount,
    };
  }).filter((x) => x.amount);
}

export function linesToBankTx(lines: string[][], bankId: string): Omit<import("./mock-data").BankTx, "id">[] {
  const dateRe = /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2}/;
  const out: Omit<import("./mock-data").BankTx, "id">[] = [];
  for (const line of lines) {
    const joined = line.join(" ");
    const dateMatch = joined.match(dateRe);
    if (!dateMatch) continue;
    // negatif işaretli sayıyı algıla
    const numMatch = joined.match(/-?[\d.,]+\s*(TL|₺)?\s*$/i);
    if (!numMatch) continue;
    const raw = numMatch[0].replace(/[^\d.,-]/g, "");
    const amount = (raw.startsWith("-") ? -1 : 1) * NUM(raw.replace("-", ""));
    if (!amount) continue;
    const desc = joined.replace(dateRe, "").replace(/-?[\d.,]+\s*(TL|₺)?\s*$/i, "").trim().slice(0, 80);
    out.push({ bankId, date: dateMatch[0], description: desc || "—", amount });
  }
  return out;
}
