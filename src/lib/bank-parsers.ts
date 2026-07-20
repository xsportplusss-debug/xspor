// Modüler banka ekstre PDF parser'ları.
// Yeni banka eklemek için: PARSERS listesine bir { name, detect, parse } girişi ekleyin.
//
// Parser gövde satırlarını (birleştirilmiş metin, satır bazında) alır ve
// çok satırlı açıklamaları tek harekete gruplar.

import type { BankTx } from "./mock-data";

type Ctx = { bankId: string; lines: string[] };
export type BankParser = {
  name: string;
  detect: (text: string) => boolean;
  parse: (c: Ctx) => Omit<BankTx, "id">[];
};

// ----- yardımcılar -----
const toNum = (s: string): number => {
  const raw = (s || "").replace(/[^\d.,-]/g, "").trim();
  if (!raw) return 0;
  const neg = raw.startsWith("-");
  const clean = raw.replace(/^-/, "");
  const hasComma = clean.includes(",");
  const norm = hasComma ? clean.replace(/\./g, "").replace(",", ".") : clean.replace(/,/g, "");
  const n = parseFloat(norm);
  return isNaN(n) ? 0 : neg ? -n : n;
};

const toIso = (s: string): string => {
  const m = s.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (!m) return "";
  const [, d, mo, y] = m;
  const yr = y.length === 2 ? "20" + y : y;
  return `${yr}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
};

const classify = (desc: string, amount: number): string => {
  const d = desc.toLowerCase();
  if (/fast|eft|havale/.test(d)) return amount > 0 ? "Gelen Havale/EFT" : "Giden Havale/EFT";
  if (/kredi kart/.test(d)) return "Kredi Kartı";
  if (/nakit çek|nakit çekile|nakit para çek|mevduat para çek/.test(d)) return "Nakit Çekim";
  if (/nakit yat/.test(d)) return "Nakit Yatırma";
  if (/pos/.test(d)) return "POS";
  if (/masraf|komisyon|ücret/.test(d)) return "Masraf/Komisyon";
  if (/vergi|otm ödeme|fatura/.test(d)) return "Fatura/Vergi";
  return "";
};

// ---------- Halkbank ----------
// Başlık satırı:  dd-mm-yyyy  <tutar±>  <bakiye>  <açıklama...>
// Devam satırı: tarih ile başlamaz — önceki hareketin açıklamasına eklenir.
const halkbank: BankParser = {
  name: "Halkbank",
  detect: (t) => /halkbank|halk bankas|türkiye halk/i.test(t),
  parse: ({ bankId, lines }) => {
    const header = /^(\d{2}-\d{2}-\d{4})\s+(-?[\d.]+,\d{2})\s+(-?[\d.]+,\d{2})\s+(.*)$/;
    const out: any[] = [];
    let cur: any = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.match(header);
      if (m) {
        if (cur) out.push(cur);
        const amount = toNum(m[2]);
        const balance = toNum(m[3]);
        const desc = m[4].trim();
        cur = {
          bankId,
          date: toIso(m[1]),
          amount,
          debit: amount < 0 ? -amount : undefined,
          credit: amount > 0 ? amount : undefined,
          balance,
          description: desc,
          category: classify(desc, amount) || undefined,
          source: "PDF" as const,
          status: "Yeni" as const,
        };
      } else if (cur) {
        cur.description = `${cur.description} ${line}`.replace(/\s+/g, " ").trim();
        if (cur.category === undefined) {
          const c = classify(cur.description, cur.amount);
          if (c) cur.category = c;
        }
      }
    }
    if (cur) out.push(cur);
    return out;
  },
};

// ---------- VakıfBank ----------
const vakifbank: BankParser = {
  name: "VakıfBank",
  detect: (t) => /vak[ıi]fbank|vak[ıi]flar bankas/i.test(t),
  parse: ({ bankId, lines }) => {
    const header = /^(\d{2}\.\d{2}\.\d{4})\s+\d{1,2}:\d{2}\s+(\d{6,})\s+(-?[\d.]+,\d{2})\s+(-?[\d.]+,\d{2})\s+(.*)$/;
    const out: any[] = [];
    let cur: any = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.match(header);
      if (m) {
        if (cur) out.push(cur);
        const amount = toNum(m[3]);
        const balance = toNum(m[4]);
        const işlem = m[5].trim();
        cur = {
          bankId,
          date: toIso(m[1]),
          amount,
          debit: amount < 0 ? -amount : undefined,
          credit: amount > 0 ? amount : undefined,
          balance,
          refNo: m[2],
          description: işlem,
          category: classify(işlem, amount) || işlem.slice(0, 40),
          source: "PDF" as const,
          status: "Yeni" as const,
        };
      } else if (cur) {
        cur.description = `${cur.description} — ${line}`
          .replace(/\s+/g, " ").trim().slice(0, 400);
      }
    }
    if (cur) out.push(cur);
    return out;
  },
};

// ---------- Genel fallback ----------
const generic: BankParser = {
  name: "Genel",
  detect: () => true,
  parse: ({ bankId, lines }) => {
    const out: Omit<BankTx, "id">[] = [];
    const anyDate = /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/;
    for (const raw of lines) {
      const line = raw.trim();
      const dm = line.match(anyDate);
      if (!dm) continue;
      const nums = line.match(/-?[\d.]+,\d{2}/g);
      if (!nums || !nums.length) continue;
      // İlk sayı tutar, varsa son sayı bakiye kabul edilir
      const amount = toNum(nums[0]);
      if (!amount) continue;
      let desc = line.replace(anyDate, "");
      for (const n of nums) desc = desc.replace(n, "");
      desc = desc.replace(/\s+/g, " ").trim().slice(0, 300);
      out.push({
        bankId,
        date: toIso(dm[0]),
        amount,
        description: desc || "—",
        category: classify(desc, amount) || undefined,
      });
    }
    return out;
  },
};

export const BANK_PARSERS: BankParser[] = [halkbank, vakifbank, generic];

export function parseBankPdf(
  lines: string[],
  bankId: string,
): { txs: Omit<BankTx, "id">[]; parser: string } {
  const text = lines.join("\n");
  for (const p of BANK_PARSERS) {
    if (p.detect(text)) {
      const txs = p.parse({ bankId, lines });
      if (txs.length) return { txs, parser: p.name };
    }
  }
  return { txs: [], parser: "Bilinmiyor" };
}
