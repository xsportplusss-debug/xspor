// Halkbank PDF ekstre parser'ı — bağımsız modül.
import type { BankParser, ParserInput, ParseOutput, RawTx } from "./types";
import {
  toISODate, toNumberTR, squish, period, extractIban, detectCurrency,
} from "./utils";

const HEAD_HINT = /halkbank|halk bankas[ıi]|halkbank\.com\.tr|TRHBTR2A/i;

// 12.03.2025  -1.234,56  9.876,54  ACIKLAMA ...
const ROW = /^(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(-?[\d.,]+)\s+(-?[\d.,]+)\s+(.+)$/;
// 12.03.2025 ACIKLAMA ... -1.234,56
const ROW_TRAILING = /^(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(.+?)\s+(-?[\d.,]+)\s*(?:TL|TRY)?$/i;

function isNoise(line: string) {
  return /^(HESAP ÖZET|Sayfa No|Türkiye Halk Bankas|halkbank\.com\.tr|Müşteri (Bilgileriniz|Numaras|Ad)|Hesap (Bilgileriniz|No|Türü|Adı|Özeti)|Bakiye Bilgileriniz|İşlem Tarihi\s+İşlem Tutarı|TCKN|IBAN\s*:|Şube Kodu|Döviz Cinsi|Üretim Zamanı|Dönemi\s*:|Hesap Bakiyesi|Bloke Bakiyesi|Kullanılabilir|Toplam Kredi)/i.test(line);
}

function parse(input: ParserInput): ParseOutput {
  const txs: RawTx[] = [];
  const warnings: string[] = [];
  const accountIban = extractIban(input.text);
  const currency = detectCurrency(input.text.slice(0, 2000)) ?? "TRY";
  const branch = input.text.match(/Şube(?:\s*(?:Ad[ıi]|Kodu))?\s*:?\s*([^\n]{2,40})/i)?.[1]?.trim();

  for (const rawLine of input.lines) {
    const line = squish(rawLine);
    if (!line || isNoise(line)) continue;

    const m = line.match(ROW);
    if (m) {
      const date = toISODate(m[1]);
      const amount = toNumberTR(m[2]);
      if (date && amount) {
        const desc = squish(m[4]);
        txs.push({
          date,
          description: desc || "İşlem",
          operation: desc.split(" ")[0],
          amount,
          debit: amount < 0 ? -amount : undefined,
          credit: amount > 0 ? amount : undefined,
          balance: toNumberTR(m[3]),
          currency,
          branch,
          counterpartyIban: extractIban(desc),
          raw: { line },
        });
        continue;
      }
    }

    const m2 = line.match(ROW_TRAILING);
    if (m2) {
      const date = toISODate(m2[1]);
      const amount = toNumberTR(m2[3]);
      if (date && amount) {
        const desc = squish(m2[2]);
        txs.push({
          date,
          description: desc || "İşlem",
          amount,
          debit: amount < 0 ? -amount : undefined,
          credit: amount > 0 ? amount : undefined,
          currency,
          branch,
          counterpartyIban: extractIban(desc),
          raw: { line },
        });
        continue;
      }
    }

    const last = txs[txs.length - 1];
    if (last && !/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/.test(line)) {
      last.description = squish(`${last.description} ${line}`);
      if (!last.counterpartyIban) last.counterpartyIban = extractIban(line);
    }
  }

  if (!txs.length) warnings.push("Halkbank formatı tanındı ancak hareket satırı bulunamadı.");
  const p = period(txs.map((t) => t.date));

  return { parser: "halkbank-pdf", transactions: txs, accountIban, currency, warnings, ...p };
}

export const halkbankPdfParser: BankParser = {
  id: "halkbank-pdf",
  bankKey: "halkbank",
  label: "Halkbank PDF Ekstre",
  detect: (i) => i.kind === "pdf" && HEAD_HINT.test(i.text),
  parse,
};
