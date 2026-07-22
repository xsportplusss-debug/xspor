// Bank statement parsers for CSV, XLSX, MT940 and PDF.
// Returns a normalized list of transactions.
import * as XLSX from "xlsx";

export type ParsedTx = {
  date: string;         // ISO YYYY-MM-DD
  description: string;
  amount: number;       // positive = incoming, negative = outgoing
  debit?: number;
  credit?: number;
  balance?: number;
  refNo?: string;
  currency?: string;
};

export type ParseResult = {
  transactions: ParsedTx[];
  periodStart?: string;
  periodEnd?: string;
};

const NUM_RE = /-?[\d\.,]+/;

function toNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const s = String(v).trim();
  if (!s) return 0;
  // Turkish format: 1.234,56 or -1.234,56 TL
  const m = s.match(/-?[\d\.,]+/);
  if (!m) return 0;
  let n = m[0].replace(/\./g, "").replace(",", ".");
  if (/-/.test(s) && !n.startsWith("-")) n = "-" + n.replace(/-/g, "");
  const num = parseFloat(n);
  return isNaN(num) ? 0 : num;
}

function toISODate(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  // dd.mm.yyyy or dd/mm/yyyy or dd-mm-yyyy
  let m = s.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) {
    const [, d, mo, y] = m;
    const yy = y.length === 2 ? "20" + y : y;
    return `${yy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[0];
  return "";
}

const HEADERS: Record<string, RegExp> = {
  date: /tarih|date|işlem\s*tar|islem\s*tar/i,
  description: /açıklama|aciklama|description|işlem|islem|detay/i,
  amount: /tutar|amount/i,
  debit: /borç|borc|debit|çıkan|cikan/i,
  credit: /alacak|credit|giren/i,
  balance: /bakiye|balance/i,
  ref: /referans|ref\.?\s*no|dekont|belge/i,
};

function detectColumn(cells: string[], re: RegExp): number {
  return cells.findIndex((c) => c && re.test(String(c)));
}

function parseRows(rows: unknown[][]): ParsedTx[] {
  if (!rows.length) return [];
  // Find header row (contains 'tarih' + amount-ish)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const cells = (rows[i] || []).map((x) => String(x ?? ""));
    if (detectColumn(cells, HEADERS.date) >= 0 &&
        (detectColumn(cells, HEADERS.amount) >= 0 ||
         detectColumn(cells, HEADERS.debit) >= 0 ||
         detectColumn(cells, HEADERS.credit) >= 0)) {
      headerIdx = i; break;
    }
  }
  if (headerIdx < 0) return [];
  const header = (rows[headerIdx] || []).map((x) => String(x ?? ""));
  const col = {
    date: detectColumn(header, HEADERS.date),
    desc: detectColumn(header, HEADERS.description),
    amount: detectColumn(header, HEADERS.amount),
    debit: detectColumn(header, HEADERS.debit),
    credit: detectColumn(header, HEADERS.credit),
    balance: detectColumn(header, HEADERS.balance),
    ref: detectColumn(header, HEADERS.ref),
  };

  const out: ParsedTx[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const date = col.date >= 0 ? toISODate(r[col.date]) : "";
    if (!date) continue;
    const desc = col.desc >= 0 ? String(r[col.desc] ?? "").trim() : "";
    let amount = 0;
    let debit: number | undefined;
    let credit: number | undefined;
    if (col.amount >= 0) amount = toNumber(r[col.amount]);
    if (col.debit >= 0) { debit = Math.abs(toNumber(r[col.debit])); if (debit) amount = -debit; }
    if (col.credit >= 0) { credit = Math.abs(toNumber(r[col.credit])); if (credit) amount = credit; }
    if (!amount && !debit && !credit) continue;
    out.push({
      date,
      description: desc || "İşlem",
      amount,
      debit,
      credit,
      balance: col.balance >= 0 ? toNumber(r[col.balance]) : undefined,
      refNo: col.ref >= 0 ? String(r[col.ref] ?? "").trim() : undefined,
    });
  }
  return out;
}

export async function parseCSV(file: File): Promise<ParseResult> {
  const text = await file.text();
  const delim = text.includes(";") && text.split(";").length > text.split(",").length ? ";" : ",";
  const rows: string[][] = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => {
      const out: string[] = [];
      let cur = ""; let quoted = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { quoted = !quoted; continue; }
        if (ch === delim && !quoted) { out.push(cur); cur = ""; continue; }
        cur += ch;
      }
      out.push(cur);
      return out;
    });
  const txs = parseRows(rows);
  return withPeriod(txs);
}

export async function parseXLSX(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  let all: ParsedTx[] = [];
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, raw: true, defval: "" });
    const txs = parseRows(rows as unknown[][]);
    if (txs.length) all = all.concat(txs);
  }
  return withPeriod(all);
}

export async function parseMT940(file: File): Promise<ParseResult> {
  const text = await file.text();
  // Blocks separated by '-' on its own line
  const blocks = text.split(/\r?\n-\r?\n?/);
  const txs: ParsedTx[] = [];
  for (const b of blocks) {
    const lines = b.split(/\r?\n/);
    let current: { line61?: string; line86?: string } = {};
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith(":61:")) {
        if (current.line61) {
          pushMT(current, txs);
          current = {};
        }
        current.line61 = line.slice(4);
      } else if (line.startsWith(":86:")) {
        current.line86 = (current.line86 ? current.line86 + " " : "") + line.slice(4);
      } else if (current.line86 && !line.startsWith(":")) {
        current.line86 += " " + line.trim();
      }
    }
    if (current.line61) pushMT(current, txs);
  }
  return withPeriod(txs);
}

function pushMT(cur: { line61?: string; line86?: string }, out: ParsedTx[]) {
  const l = cur.line61 ?? "";
  // Format: YYMMDD[MMDD]C|D[R]amount NTRF ref
  const m = l.match(/^(\d{6})(?:\d{4})?([CD])R?([\d,\.]+)/i);
  if (!m) return;
  const [, ymd, dc, amt] = m;
  const yy = ymd.slice(0, 2), mm = ymd.slice(2, 4), dd = ymd.slice(4, 6);
  const date = `20${yy}-${mm}-${dd}`;
  const value = toNumber(amt);
  const amount = /D/i.test(dc) ? -value : value;
  out.push({
    date,
    description: (cur.line86 ?? "").trim() || "MT940 hareket",
    amount,
    debit: amount < 0 ? -amount : undefined,
    credit: amount > 0 ? amount : undefined,
  });
}

export async function parsePDF(file: File): Promise<ParseResult> {
  const pdfjs = await import("pdfjs-dist");
  // Vite worker
  const worker = await import("pdfjs-dist/build/pdf.worker.mjs?url");
  (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = (worker as { default: string }).default;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    // Group by y coordinate to form lines
    const rowsMap = new Map<number, { x: number; str: string }[]>();
    for (const item of tc.items as { str: string; transform: number[] }[]) {
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (!rowsMap.has(y)) rowsMap.set(y, []);
      rowsMap.get(y)!.push({ x, str: item.str });
    }
    const ys = [...rowsMap.keys()].sort((a, b) => b - a);
    for (const y of ys) {
      const parts = rowsMap.get(y)!.sort((a, b) => a.x - b.x).map((c) => c.str).join(" ");
      if (parts.trim()) lines.push(parts.trim());
    }
  }
  const txs: ParsedTx[] = [];
  // Match: dd.mm.yyyy ... amount
  const rowRe = /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(.+?)\s+(-?[\d\.,]+)\s*(?:TL|TRY)?\s*$/i;
  for (const line of lines) {
    const m = line.match(rowRe);
    if (!m) continue;
    const date = toISODate(m[1]);
    if (!date) continue;
    const desc = m[2].trim();
    const amount = toNumber(m[3]);
    if (!amount) continue;
    txs.push({ date, description: desc, amount });
  }
  return withPeriod(txs);
}

function withPeriod(transactions: ParsedTx[]): ParseResult {
  if (!transactions.length) return { transactions };
  const dates = transactions.map((t) => t.date).filter(Boolean).sort();
  return {
    transactions,
    periodStart: dates[0],
    periodEnd: dates[dates.length - 1],
  };
}

export async function parseStatement(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCSV(file);
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseXLSX(file);
  if (name.endsWith(".pdf")) return parsePDF(file);
  if (name.endsWith(".mt940") || name.endsWith(".sta") || name.endsWith(".txt")) return parseMT940(file);
  throw new Error("Desteklenmeyen dosya biçimi. PDF, XLSX, CSV veya MT940 kullanın.");
}

export async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
