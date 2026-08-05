// VAKIFBANK PDF ekstre okuyucu — yalnızca VakıfBank için.
// Halkbank parser'ından hiçbir kod kullanılmaz; sütun düzeni farklıdır:
// TARİH | SAAT | İŞLEM NO | MİKTAR | BAKİYE | İŞLEM ADI
import {
  DATE_AT_START, TIME_RE, isMoney, isoDate, trNumber, squish, ibanOf, currencyOf, periodOf,
  type BankParser, type ParseResult, type ParserInput, type StdTx,
} from "../core";

const NOISE =
  /^(Sayfa|HESAP (ÖZET|EKSTRE)|T\.? ?Vak[ıi]flar|VakıfBank|vakifbank\.com|IBAN\s*:|Hesap (No|Adı|Türü)|Müşteri|Şube|Döviz|Devir|Bakiye\s*:|Toplam|Tarih\s+Saat|www\.)/i;

type Draft = {
  date: string;
  time?: string;
  txNo?: string;
  amount?: number;
  balance?: number;
  name: string[];
  line: number;
  text: string;
};

function isTxNo(s: string) {
  return /^[0-9]{4,}$/.test(s) || /^[0-9A-Z]{6,}$/.test(s);
}

function parse(input: ParserInput): ParseResult {
  const txs: StdTx[] = [];
  const errors: ParseResult["errors"] = [];
  const currency = currencyOf(input.text.slice(0, 3000)) ?? "TRY";
  const accountIban = ibanOf(input.text);
  let draft: Draft | null = null;

  const flush = () => {
    if (!draft) return;
    if (draft.amount === undefined) {
      errors.push({ line: draft.line, text: draft.text, reason: "Miktar okunamadı" });
      draft = null;
      return;
    }
    txs.push({
      date: draft.date,
      time: draft.time,
      txNo: draft.txNo,
      description: squish(draft.name.join(" ")) || "İşlem",
      amount: draft.amount,
      balance: draft.balance,
      currency,
      raw: { source: "vakifbank-pdf" },
    });
    draft = null;
  };

  /** Bir satırdaki alanları sırasıyla drafta yerleştirir; kalanı işlem adına ekler. */
  const consume = (d: Draft, tokens: string[]) => {
    const leftover: string[] = [];
    for (const tk of tokens) {
      if (!d.time && TIME_RE.test(tk) && /^\d{1,2}:\d{2}/.test(tk)) {
        d.time = tk.slice(0, 5);
        continue;
      }
      if (!d.txNo && d.amount === undefined && isTxNo(tk) && !isMoney(tk.replace(/\D/g, "x"))) {
        d.txNo = tk;
        continue;
      }
      if (isMoney(tk) && /\d/.test(tk) && (d.amount === undefined || d.balance === undefined) && !leftover.length) {
        const n = trNumber(tk);
        if (n !== undefined) {
          if (d.amount === undefined) d.amount = n;
          else d.balance = n;
          continue;
        }
      }
      leftover.push(tk);
    }
    if (leftover.length) d.name.push(squish(leftover.join(" ")));
  };

  input.lines.forEach((rawLine, idx) => {
    const line = squish(rawLine);
    if (!line) return;

    const dm = line.match(DATE_AT_START);
    if (dm) {
      const date = isoDate(dm[0]);
      if (date) {
        flush();
        draft = { date, name: [], line: idx + 1, text: line };
        consume(draft, line.slice(dm[0].length).trim().split(/\s+/).filter(Boolean));
        return;
      }
    }

    if (!draft) return;
    if (NOISE.test(line)) return;

    const tokens = line.split(/\s+/);
    const stillMissing = draft.amount === undefined || draft.balance === undefined ||
      (!draft.time && draft.name.length === 0) || (!draft.txNo && draft.name.length === 0);
    if (stillMissing) consume(draft, tokens);
    else draft.name.push(line);
  });

  flush();

  return {
    parser: "vakifbank-pdf",
    bankCode: "vakifbank",
    transactions: txs,
    totalRead: txs.length + errors.length,
    skipped: 0,
    errors,
    accountIban,
    currency,
    ...periodOf(txs.map((t) => t.date)),
  };
}

export const vakifbankParser: BankParser = {
  id: "vakifbank-pdf",
  bankCode: "vakifbank",
  label: "VakıfBank Ekstre Okuyucu",
  parse,
};
