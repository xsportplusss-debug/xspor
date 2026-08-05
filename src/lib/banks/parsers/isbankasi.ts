// İş Bankası PDF ekstre okuyucu — yalnızca İş Bankası için (bağımsız modül).
import {
  DATE_AT_START, TIME_RE, isMoney, isoDate, trNumber, squish, ibanOf, currencyOf, periodOf,
  type BankParser, type ParseResult, type ParserInput, type StdTx,
} from "../core";

const NOISE = /^(Sayfa|HESAP (ÖZET|EKSTRE)|IBAN\s*:|Hesap (No|Adı|Türü)|Müşteri|Şube|Döviz|Toplam|Tarih\s+Açıklama|www\.|İş Bankas|Is Bankas|isbank)/i;

type Draft = {
  date: string;
  time?: string;
  txNo?: string;
  amount?: number;
  balance?: number;
  desc: string[];
  line: number;
  text: string;
};

function parse(input: ParserInput): ParseResult {
  const txs: StdTx[] = [];
  const errors: ParseResult["errors"] = [];
  const currency = currencyOf(input.text.slice(0, 3000)) ?? "TRY";
  const accountIban = ibanOf(input.text);
  let draft: Draft | null = null;

  const flush = () => {
    if (!draft) return;
    if (draft.amount === undefined) {
      errors.push({ line: draft.line, text: draft.text, reason: "Tutar okunamadı" });
      draft = null;
      return;
    }
    txs.push({
      date: draft.date,
      time: draft.time,
      txNo: draft.txNo,
      description: squish(draft.desc.join(" ")) || "İşlem",
      amount: draft.amount,
      balance: draft.balance,
      currency,
      raw: { source: "isbankasi-pdf" },
    });
    draft = null;
  };

  const consume = (d: Draft, tokens: string[]) => {
    const leftover: string[] = [];
    for (const tk of tokens) {
      if (!d.time && /^\d{1,2}:\d{2}/.test(tk) && TIME_RE.test(tk)) { d.time = tk.slice(0, 5); continue; }
      if (isMoney(tk) && /\d/.test(tk) && (d.amount === undefined || d.balance === undefined)) {
        const n = trNumber(tk);
        if (n !== undefined) {
          if (d.amount === undefined) d.amount = n;
          else d.balance = n;
          continue;
        }
      }
      leftover.push(tk);
    }
    if (leftover.length) d.desc.push(squish(leftover.join(" ")));
  };

  input.lines.forEach((rawLine, idx) => {
    const line = squish(rawLine);
    if (!line) return;
    const dm = line.match(DATE_AT_START);
    if (dm) {
      const date = isoDate(dm[0]);
      if (date) {
        flush();
        draft = { date, desc: [], line: idx + 1, text: line };
        consume(draft, line.slice(dm[0].length).trim().split(/\s+/).filter(Boolean));
        return;
      }
    }
    if (!draft) return;
    if (NOISE.test(line)) return;
    if (draft.amount === undefined || draft.balance === undefined) consume(draft, line.split(/\s+/));
    else draft.desc.push(line);
  });

  flush();

  return {
    parser: "isbankasi-pdf",
    bankCode: "isbankasi",
    transactions: txs,
    totalRead: txs.length + errors.length,
    skipped: 0,
    errors,
    accountIban,
    currency,
    ...periodOf(txs.map((t) => t.date)),
  };
}

export const isbankasiParser: BankParser = {
  id: "isbankasi-pdf",
  bankCode: "isbankasi",
  label: "İş Bankası Ekstre Okuyucu",
  parse,
};
