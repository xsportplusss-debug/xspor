// Modüler banka ekstre PDF parser'ları.
// Yeni banka eklemek için: DETECTORS listesine bir { match, parse } girişi ekleyin.

import type { BankTx } from "./mock-data";

type Ctx = { bankId: string; text: string; lines: string[][] };
type Parser = { name: string; match: (t: string) => boolean; parse: (c: Ctx) => Omit<BankTx, "id">[] };

// yardımcılar
const toNum = (s: string): number => {
  const raw = s.replace(/[^\d.,-]/g, "").trim();
  if (!raw) return 0;
  const neg = raw.startsWith("-");
  const clean = raw.replace(/^-/, "");
  // TR: nokta binlik, virgül ondalık
  const hasComma = clean.includes(",");
  const norm = hasComma ? clean.replace(/\./g, "").replace(",", ".") : clean.replace(/,/g, "");
  const n = parseFloat(norm);
  return isNaN(n) ? 0 : neg ? -n : n;
};

const toIsoDate = (s: string): string => {
  const m = s.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (!m) return "";
  const [, d, mo, y] = m;
  const yr = y.length === 2 ? "20" + y : y;
  return `${yr}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
};

// ---------- Halkbank ----------
// Tipik satır: TARİH  VALÖR  AÇIKLAMA  BORÇ  ALACAK  BAKİYE
const halkbank: Parser = {
  name: "Halkbank",
  match: (t) => /halkbank|halk bankas[ıi]/i.test(t),
  parse: ({ bankId, lines }) => {
    const out: Omit<BankTx, "id">[] = [];
    const dateRe = /\d{2}[./-]\d{2}[./-]\d{4}/g;
    for (const cells of lines) {
      const joined = cells.join(" ");
      const dates = joined.match(dateRe);
      if (!dates || dates.length === 0) continue;
      const nums = joined.match(/-?[\d.]+,\d{2}/g) || [];
      if (nums.length < 2) continue;
      // Halkbank: son 3 sayı borç, alacak, bakiye (biri boş olabilir → "0,00" gelmez, atlanır)
      const last = nums.slice(-3);
      let debit = 0, credit = 0;
      if (last.length === 3) {
        debit = toNum(last[0]); credit = toNum(last[1]);
      } else if (last.length === 2) {
        // borç veya alacak + bakiye
        const val = toNum(last[0]);
        if (/borç|debit|çıkış/i.test(joined)) debit = val; else credit = val;
      }
      const amount = credit - debit;
      if (!amount) continue;
      const date = toIsoDate(dates[0]);
      let desc = joined;
      for (const d of dates) desc = desc.replace(d, "");
      for (const n of nums) desc = desc.replace(n, "");
      out.push({ bankId, date, description: desc.replace(/\s+/g, " ").trim().slice(0, 200), amount });
    }
    return out;
  },
};

// ---------- VakıfBank ----------
// Tipik satır: TARİH  AÇIKLAMA  TUTAR  BAKİYE  (Tutar +/- işaretli)
const vakifbank: Parser = {
  name: "VakıfBank",
  match: (t) => /vak[ıi]fbank|vak[ıi]f\s?bank/i.test(t),
  parse: ({ bankId, lines }) => {
    const out: Omit<BankTx, "id">[] = [];
    const dateRe = /\d{2}[./-]\d{2}[./-]\d{4}/g;
    for (const cells of lines) {
      const joined = cells.join(" ");
      const dates = joined.match(dateRe);
      if (!dates) continue;
      const nums = joined.match(/-?[\d.]+,\d{2}/g) || [];
      if (nums.length < 1) continue;
      // Son 2 sayıdan ilki tutar (işaretli olabilir), ikincisi bakiye
      const last = nums.slice(-2);
      const amount = toNum(last[0]);
      if (!amount) continue;
      const date = toIsoDate(dates[0]);
      let desc = joined;
      for (const d of dates) desc = desc.replace(d, "");
      for (const n of nums) desc = desc.replace(n, "");
      out.push({ bankId, date, description: desc.replace(/\s+/g, " ").trim().slice(0, 200), amount });
    }
    return out;
  },
};

// ---------- Genel fallback ----------
const generic: Parser = {
  name: "Genel",
  match: () => true,
  parse: ({ bankId, lines }) => {
    const out: Omit<BankTx, "id">[] = [];
    const dateRe = /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/;
    for (const cells of lines) {
      const joined = cells.join(" ");
      const dm = joined.match(dateRe);
      if (!dm) continue;
      const nm = joined.match(/-?[\d.]+,\d{2}|-?[\d.,]+\s*(TL|₺)?\s*$/i);
      if (!nm) continue;
      const amount = toNum(nm[0]);
      if (!amount) continue;
      const desc = joined.replace(dateRe, "").replace(/-?[\d.,]+\s*(TL|₺)?\s*$/i, "").trim().slice(0, 200);
      out.push({ bankId, date: toIsoDate(dm[0]), description: desc || "—", amount });
    }
    return out;
  },
};

const DETECTORS: Parser[] = [halkbank, vakifbank, generic];

export function parseBankPdf(lines: string[][], bankId: string): { txs: Omit<BankTx, "id">[]; parser: string } {
  const text = lines.map((l) => l.join(" ")).join("\n");
  for (const p of DETECTORS) {
    if (p.match(text)) {
      const txs = p.parse({ bankId, text, lines });
      if (txs.length) return { txs, parser: p.name };
    }
  }
  return { txs: [], parser: "Bilinmiyor" };
}
