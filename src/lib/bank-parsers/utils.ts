// Parser yardımcıları — tarih / sayı normalizasyonu ve ortak regexler.

import * as XLSX from "xlsx";

export const IBAN_RE = /TR\s?\d{2}(?:\s?\d{4}){5}\s?\d{2}/i;
export const DATE_RE = /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/;

export function toNumberTR(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  let s = String(v).trim();
  if (!s) return 0;
  const neg = /^-|^\(|-$/.test(s) || /\)$/.test(s);
  s = s.replace(/[()]/g, "");
  const m = s.match(/-?[\d.,]+/);
  if (!m) return 0;
  let t = m[0];
  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  if (lastComma > lastDot) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    t = t.replace(/,/g, "");
  } else {
    t = t.replace(/[.,]/g, "");
  }
  let n = parseFloat(t);
  if (!isFinite(n)) return 0;
  if (neg && n > 0) n = -n;
  return n;
}

export function toISODate(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d && d.y) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    return "";
  }
  const s = String(v).trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(DATE_RE);
  if (m) {
    const [, d, mo, y] = m;
    const yy = y.length === 2 ? (Number(y) > 70 ? "19" + y : "20" + y) : y;
    return `${yy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return "";
}

export function extractTime(s: string): string | undefined {
  const m = s.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/);
  if (!m) return undefined;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

export function extractIban(s: string): string | undefined {
  const m = s.match(IBAN_RE);
  return m ? m[0].replace(/\s+/g, "").toUpperCase() : undefined;
}

export function detectCurrency(s: string): string | undefined {
  if (/\bTRY\b|\bTL\b|₺/.test(s)) return "TRY";
  if (/\bUSD\b|\$/.test(s)) return "USD";
  if (/\bEUR\b|€/.test(s)) return "EUR";
  if (/\bGBP\b|£/.test(s)) return "GBP";
  return undefined;
}

export function squish(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function period(dates: string[]) {
  const clean = dates.filter(Boolean).sort();
  return { periodStart: clean[0], periodEnd: clean[clean.length - 1] };
}

/** date|time|amount|desc|ref kombinasyonundan mükerrer anahtarı üretir. */
export function dedupKey(t: {
  date: string; time?: string; amount: number; description?: string; refNo?: string;
}): string {
  return [
    t.date,
    t.time ?? "",
    t.amount.toFixed(2),
    squish(t.description ?? "").slice(0, 80).toLocaleLowerCase("tr-TR"),
    (t.refNo ?? "").trim().toLocaleLowerCase("tr-TR"),
  ].join("|");
}
