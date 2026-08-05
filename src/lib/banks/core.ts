// Banka modülü çekirdeği — ortak veri modeli ve düşük seviye yardımcılar.
// NOT: Her banka parser'ı bağımsızdır; burada yalnızca tarih/sayı gibi
// bankadan bağımsız temel yardımcılar bulunur.

export type StdTx = {
  date: string;              // ISO YYYY-MM-DD
  time?: string;             // HH:MM
  txNo?: string;             // İşlem / dekont no
  description: string;
  amount: number;            // + giriş, - çıkış
  balance?: number;
  currency?: string;
  raw?: Record<string, unknown>;
};

export type ParseResult = {
  parser: string;
  bankCode: string;
  transactions: StdTx[];
  totalRead: number;
  skipped: number;
  errors: { line: number; text: string; reason: string }[];
  periodStart?: string;
  periodEnd?: string;
  accountIban?: string;
  currency?: string;
};

export type ParserInput = {
  kind: "pdf" | "sheet";
  fileName: string;
  lines: string[];
  text: string;
  rows: unknown[][];
};

export type BankParser = {
  id: string;
  bankCode: string;
  label: string;
  parse: (input: ParserInput) => ParseResult;
};

/** Desteklenen tarih biçimleri: dd.MM.yyyy, d.M.yyyy, dd/MM/yyyy, dd-MM-yyyy */
export const DATE_TOKEN = /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/;
export const DATE_AT_START = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/;

export function isoDate(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const m = s.match(DATE_TOKEN);
  if (!m) return "";
  const [, d, mo, y] = m;
  const yy = y.length === 2 ? (Number(y) > 70 ? `19${y}` : `20${y}`) : y;
  const dt = { d: Number(d), m: Number(mo) };
  if (dt.m < 1 || dt.m > 12 || dt.d < 1 || dt.d > 31) return "";
  return `${yy}-${String(dt.m).padStart(2, "0")}-${String(dt.d).padStart(2, "0")}`;
}

/** "1.234,56" / "-1,234.56" / "(1.234,56)" → sayı */
export function trNumber(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "number") return isFinite(v) ? v : undefined;
  let s = String(v).trim();
  if (!s) return undefined;
  const neg = /^-/.test(s) || /-$/.test(s) || /^\(.*\)$/.test(s);
  s = s.replace(/[()₺$€\s]|TL|TRY|USD|EUR/gi, "");
  const m = s.match(/-?\d[\d.,]*/);
  if (!m) return undefined;
  let t = m[0];
  const lc = t.lastIndexOf(",");
  const ld = t.lastIndexOf(".");
  if (lc > ld) t = t.replace(/\./g, "").replace(",", ".");
  else if (ld > lc) t = t.replace(/,/g, "");
  else t = t.replace(/[.,]/g, "");
  const n = parseFloat(t);
  if (!isFinite(n)) return undefined;
  return neg && n > 0 ? -n : n;
}

/** Bir metin parçası tamamen para/sayı mı? */
export const MONEY_RE = /^-?\(?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?\)?-?(?:\s*(?:TL|TRY|USD|EUR))?$/i;
export function isMoney(s: string): boolean {
  return MONEY_RE.test(s.trim());
}

export const TIME_RE = /\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/;

export function squish(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function ibanOf(s: string): string | undefined {
  const m = s.match(/TR\s?\d{2}(?:\s?\d{4}){5}\s?\d{2}/i);
  return m ? m[0].replace(/\s+/g, "").toUpperCase() : undefined;
}

export function currencyOf(s: string): string | undefined {
  if (/\bTRY\b|\bTL\b|₺/.test(s)) return "TRY";
  if (/\bUSD\b|\$/.test(s)) return "USD";
  if (/\bEUR\b|€/.test(s)) return "EUR";
  return undefined;
}

export function periodOf(dates: string[]) {
  const clean = dates.filter(Boolean).sort();
  return { periodStart: clean[0], periodEnd: clean[clean.length - 1] };
}

/** Mükerrer kontrol anahtarı. */
export function txKey(t: { date: string; time?: string; txNo?: string; amount: number; description?: string }) {
  return [
    t.date,
    t.time ?? "",
    (t.txNo ?? "").trim(),
    t.amount.toFixed(2),
    squish(t.description ?? "").slice(0, 90).toLocaleLowerCase("tr-TR"),
  ].join("|");
}

/** Dosya içi mükerrerleri temizler. */
export function dedupeWithin(list: StdTx[]): { rows: StdTx[]; skipped: number } {
  const seen = new Set<string>();
  const rows: StdTx[] = [];
  let skipped = 0;
  for (const t of list) {
    const k = txKey(t);
    if (seen.has(k)) { skipped++; continue; }
    seen.add(k);
    rows.push(t);
  }
  return { rows, skipped };
}
