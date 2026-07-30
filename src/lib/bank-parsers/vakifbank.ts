// VakıfBank PDF ekstre parser'ı — bağımsız modül.
import type { BankParser, ParserInput, ParseOutput, RawTx } from "./types";
import {
  toISODate, toNumberTR, squish, period, extractIban, detectCurrency,
} from "./utils";

const HEAD_HINT = /vak[ıi]fbank|vak[ıi]flar bankas|vakifbank\.com\.tr|TVBATR2A/i;

// 12.03.2025 14:22 123456789 EFT GELEN  ACIKLAMA ...  1.234,56  9.876,54
const ROW = /^(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s+(\S+)\s+(.+?)\s+(-?[\d.,]+)\s+(-?[\d.,]+)\s*(?:TL|TRY|USD|EUR)?$/i;
// Saatsiz varyant: 12.03.2025 ACIKLAMA ... 1.234,56 9.876,54
const ROW_NO_TIME = /^(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(.+?)\s+(-?[\d.,]+)\s+(-?[\d.,]+)\s*(?:TL|TRY|USD|EUR)?$/i;

function isNoise(line: string) {
  return /^(Sayfa|HESAP (ÖZET|EKSTRE)|T\.? ?Vak[ıi]flar|IBAN\s*:|Hesap No|Müşteri|Şube|Döviz|Bakiye|Toplam|Tarih\s+Saat|www\.)/i.test(line);
}

function parse(input: ParserInput): ParseOutput {
  const txs: RawTx[] = [];
  const warnings: string[] = [];
  const accountIban = extractIban(input.text);
  const currency = detectCurrency(input.text.slice(0, 2000)) ?? "TRY";
  const branch = input.text.match(/Şube(?:\s*(?:Ad[ıi]|Kodu))?\s*:\s*([^\n]{2,40})/i)?.[1]?.trim();

  for (const rawLine of input.lines) {
    const line = squish(rawLine);
    if (!line) continue;

    const m = line.match(ROW);
    if (m) {
      const date = toISODate(m[1]);
      const amount = toNumberTR(m[5]);
      if (date && amount) {
        const descFull = squish(m[4]);
        const sp = descFull.indexOf(" ");
        const operation = sp > 0 ? descFull.slice(0, sp) : descFull;
        const description = sp > 0 ? descFull.slice(sp + 1) : descFull;
        txs.push({
          date,
          time: m[2].slice(0, 5),
          refNo: m[3],
          docNo: m[3],
          operation,
          description: description || operation || "İşlem",
          amount,
          debit: amount < 0 ? -amount : undefined,
          credit: amount > 0 ? amount : undefined,
          balance: toNumberTR(m[6]),
          currency,
          branch,
          counterpartyIban: extractIban(descFull),
          raw: { line },
        });
        continue;
      }
    }

    const m2 = !isNoise(line) ? line.match(ROW_NO_TIME) : null;
    if (m2) {
      const date = toISODate(m2[1]);
      const amount = toNumberTR(m2[3]);
      if (date && amount) {
        txs.push({
          date,
          description: squish(m2[2]) || "İşlem",
          amount,
          debit: amount < 0 ? -amount : undefined,
          credit: amount > 0 ? amount : undefined,
          balance: toNumberTR(m2[4]),
          currency,
          branch,
          counterpartyIban: extractIban(m2[2]),
          raw: { line },
        });
        continue;
      }
    }

    // Devam satırı → önceki işlemin açıklamasına ekle
    const last = txs[txs.length - 1];
    if (last && !isNoise(line) && !/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/.test(line)) {
      last.description = squish(`${last.description} ${line}`);
      if (!last.counterpartyIban) last.counterpartyIban = extractIban(line);
    }
  }

  if (!txs.length) warnings.push("VakıfBank formatı tanındı ancak hareket satırı bulunamadı.");
  const p = period(txs.map((t) => t.date));

  return { parser: "vakifbank-pdf", transactions: txs, accountIban, currency, warnings, ...p };
}

export const vakifbankPdfParser: BankParser = {
  id: "vakifbank-pdf",
  bankKey: "vakifbank",
  label: "VakıfBank PDF Ekstre",
  detect: (i) => i.kind === "pdf" && HEAD_HINT.test(i.text),
  parse,
};
