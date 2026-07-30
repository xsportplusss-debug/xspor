// Excel / CSV ekstre parser'ı — sütun adı eşleştirmeli, banka bağımsız.
import type { BankParser, ParserInput, ParseOutput, RawTx } from "./types";
import { toISODate, toNumberTR, squish, period, extractIban, extractTime } from "./utils";

type Field =
  | "date" | "valueDate" | "time" | "description" | "operation" | "docNo" | "refNo"
  | "debit" | "credit" | "amount" | "balance" | "currency" | "branch"
  | "counterparty" | "iban";

const MAP: Record<Field, RegExp> = {
  date: /^(işlem\s*tarihi|islem\s*tarihi|tarih|date|transaction\s*date|posting\s*date|tarihi)$/i,
  valueDate: /(val[öo]r|value\s*date|hesaba\s*ge[çc]|efektif\s*tarih)/i,
  time: /^(saat|time|işlem\s*saati)$/i,
  description: /(a[çc][ıi]klama|description|detay|narrative|i[şs]lem\s*a[çc][ıi]klama)/i,
  operation: /(i[şs]lem\s*(t[üu]r|ad|tip)|type|kanal|transaction\s*type)/i,
  docNo: /(dekont|belge\s*no|fi[şs]\s*no|document)/i,
  refNo: /(referans|ref\.?\s*no|reference|i[şs]lem\s*no)/i,
  debit: /^(bor[çc]|debit|[çc][ıi]kan|[çc][ıi]k[ıi][şs]|giden|[öo]deme)/i,
  credit: /^(alacak|credit|giren|giri[şs]|tahsil)/i,
  amount: /^(tutar|amount|i[şs]lem\s*tutar)/i,
  balance: /(bakiye|balance|kalan)/i,
  currency: /(para\s*birimi|d[öo]viz|currency|pb)/i,
  branch: /([şs]ube)/i,
  counterparty: /(kar[şs][ıi]\s*(hesap|taraf|unvan)|al[ıi]c[ıi]|g[öo]nderen|unvan|ad\s*soyad)/i,
  iban: /(iban)/i,
};

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const cells = (rows[i] ?? []).map((c) => squish(String(c ?? "")));
    const hasDate = cells.some((c) => MAP.date.test(c) || /tarih|date/i.test(c));
    const hasMoney = cells.some(
      (c) => MAP.amount.test(c) || MAP.debit.test(c) || MAP.credit.test(c) || MAP.balance.test(c),
    );
    if (hasDate && hasMoney) return i;
  }
  return -1;
}

function mapColumns(header: string[]): Partial<Record<Field, number>> {
  const out: Partial<Record<Field, number>> = {};
  const order: Field[] = [
    "date", "valueDate", "time", "description", "operation", "docNo", "refNo",
    "debit", "credit", "amount", "balance", "currency", "branch", "counterparty", "iban",
  ];
  header.forEach((raw, idx) => {
    const c = squish(raw);
    if (!c) return;
    for (const f of order) {
      if (out[f] != null) continue;
      if (MAP[f].test(c)) { out[f] = idx; return; }
    }
  });
  if (out.date == null) {
    const idx = header.findIndex((c) => /tarih|date/i.test(c));
    if (idx >= 0) out.date = idx;
  }
  return out;
}

function parse(input: ParserInput): ParseOutput {
  const rows = input.rows;
  const headerIdx = findHeaderRow(rows);
  if (headerIdx < 0) {
    return { parser: "excel", transactions: [], warnings: ["Excel/CSV içinde başlık satırı bulunamadı."] };
  }
  const header = (rows[headerIdx] ?? []).map((c) => String(c ?? ""));
  const col = mapColumns(header);
  const txs: RawTx[] = [];

  const cell = (r: unknown[], f: Field) => (col[f] != null ? r[col[f] as number] : undefined);

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const date = toISODate(cell(r, "date"));
    if (!date) continue;

    const debitRaw = col.debit != null ? Math.abs(toNumberTR(cell(r, "debit"))) : 0;
    const creditRaw = col.credit != null ? Math.abs(toNumberTR(cell(r, "credit"))) : 0;
    let amount = 0;
    if (debitRaw) amount = -debitRaw;
    if (creditRaw) amount = creditRaw;
    if (!amount && col.amount != null) amount = toNumberTR(cell(r, "amount"));
    if (!amount) continue;

    const desc = squish(String(cell(r, "description") ?? ""));
    const rawObj: Record<string, unknown> = {};
    header.forEach((h, idx) => { if (h) rawObj[squish(h)] = r[idx] ?? ""; });

    txs.push({
      date,
      valueDate: toISODate(cell(r, "valueDate")) || undefined,
      time: (cell(r, "time") ? extractTime(String(cell(r, "time"))) : undefined) ?? extractTime(desc),
      description: desc || "İşlem",
      operation: squish(String(cell(r, "operation") ?? "")) || undefined,
      docNo: squish(String(cell(r, "docNo") ?? "")) || undefined,
      refNo: squish(String(cell(r, "refNo") ?? "")) || undefined,
      debit: amount < 0 ? -amount : undefined,
      credit: amount > 0 ? amount : undefined,
      amount,
      balance: col.balance != null ? toNumberTR(cell(r, "balance")) : undefined,
      currency: squish(String(cell(r, "currency") ?? "")).toUpperCase() || undefined,
      branch: squish(String(cell(r, "branch") ?? "")) || undefined,
      counterparty: squish(String(cell(r, "counterparty") ?? "")) || undefined,
      counterpartyIban: (cell(r, "iban") ? extractIban(String(cell(r, "iban"))) : undefined) ?? extractIban(desc),
      raw: rawObj,
    });
  }

  return {
    parser: "excel",
    transactions: txs,
    warnings: txs.length ? [] : ["Excel/CSV içinde hareket satırı bulunamadı."],
    ...period(txs.map((t) => t.date)),
  };
}

export const excelParser: BankParser = {
  id: "excel",
  bankKey: "generic",
  label: "Excel / CSV Ekstre",
  detect: (i) => i.kind === "sheet",
  parse,
};
