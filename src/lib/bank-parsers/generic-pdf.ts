// Genel PDF parser (tanınmayan bankalar için son çare).
import type { BankParser, ParserInput, ParseOutput, RawTx } from "./types";
import {
  toISODate, toNumberTR, squish, period, extractIban, detectCurrency, extractTime,
} from "./utils";

const ROW_TWO_NUM = /^(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(.+?)\s+(-?[\d.,]+)\s+(-?[\d.,]+)\s*(?:TL|TRY|USD|EUR)?$/i;
const ROW_ONE_NUM = /^(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(.+?)\s+(-?[\d.,]+)\s*(?:TL|TRY|USD|EUR)?$/i;

function parse(input: ParserInput): ParseOutput {
  const txs: RawTx[] = [];
  const currency = detectCurrency(input.text.slice(0, 2000)) ?? "TRY";
  const accountIban = extractIban(input.text);

  for (const rawLine of input.lines) {
    const line = squish(rawLine);
    if (!line) continue;
    const m = line.match(ROW_TWO_NUM) ?? line.match(ROW_ONE_NUM);
    if (!m) {
      const last = txs[txs.length - 1];
      if (last && !/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/.test(line) && line.length > 3) {
        last.description = squish(`${last.description} ${line}`);
      }
      continue;
    }
    const date = toISODate(m[1]);
    const amount = toNumberTR(m[3]);
    if (!date || !amount) continue;
    const desc = squish(m[2]);
    txs.push({
      date,
      time: extractTime(desc),
      description: desc || "İşlem",
      amount,
      debit: amount < 0 ? -amount : undefined,
      credit: amount > 0 ? amount : undefined,
      balance: m[4] != null ? toNumberTR(m[4]) : undefined,
      currency,
      counterpartyIban: extractIban(desc),
      raw: { line },
    });
  }

  return {
    parser: "generic-pdf",
    transactions: txs,
    accountIban,
    currency,
    warnings: txs.length ? [] : ["PDF tanınmadı, hareket okunamadı (taranmış/görüntü PDF olabilir)."],
    ...period(txs.map((t) => t.date)),
  };
}

export const genericPdfParser: BankParser = {
  id: "generic-pdf",
  bankKey: "generic",
  label: "Genel PDF Ekstre",
  detect: (i) => i.kind === "pdf",
  parse,
};
