// HALKBANK PDF ekstre okuyucu — yalnızca Halkbank için.
// Bu dosyadaki mantık başka hiçbir banka tarafından kullanılmaz.
import {
  DATE_AT_START, isMoney, isoDate, trNumber, squish, ibanOf, currencyOf, periodOf,
  type BankParser, type ParseResult, type ParserInput, type StdTx,
} from "../core";

const NOISE =
  /^(HESAP (ÖZET|EKSTRE|BİLGİ)|Sayfa\s*No|Türkiye Halk Bankas|halkbank\.com\.tr|Müşteri|Hesap (No|Türü|Adı|Özeti|Bilgi)|Bakiye Bilgi|İşlem Tarihi\s+İşlem Tutar|TCKN|VKN|IBAN\s*:|Şube (Kodu|Adı)|Döviz (Cinsi|Kodu)|Üretim Zaman|Dönem[i]?\s*:|Devreden|Toplam (Borç|Alacak|Kredi)|Kullanılabilir|Bloke)/i;

type Draft = {
  date: string;
  amount?: number;
  balance?: number;
  desc: string[];
  line: number;
  text: string;
};

function moneyTokens(s: string): { nums: number[]; rest: string } {
  const parts = s.split(/\s+/);
  const nums: number[] = [];
  const rest: string[] = [];
  for (const p of parts) {
    if (isMoney(p) && /\d/.test(p)) {
      const n = trNumber(p);
      if (n !== undefined) { nums.push(n); continue; }
    }
    rest.push(p);
  }
  return { nums, rest: squish(rest.join(" ")) };
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
      errors.push({ line: draft.line, text: draft.text, reason: "İşlem tutarı okunamadı" });
      draft = null;
      return;
    }
    txs.push({
      date: draft.date,
      description: squish(draft.desc.join(" ")) || "İşlem",
      amount: draft.amount,
      balance: draft.balance,
      currency,
      raw: { source: "halkbank-pdf" },
    });
    draft = null;
  };

  input.lines.forEach((rawLine, idx) => {
    const line = squish(rawLine);
    if (!line) return;

    const dm = line.match(DATE_AT_START);
    if (dm) {
      const date = isoDate(dm[0]);
      if (date) {
        flush();
        const after = line.slice(dm[0].length).trim();
        // Halkbank: TARİH | TUTAR | BAKİYE | AÇIKLAMA (bazı çıktılarda açıklama önce gelir)
        const { nums, rest } = moneyTokens(after);
        draft = {
          date,
          amount: nums[0],
          balance: nums.length > 1 ? nums[1] : undefined,
          desc: rest ? [rest] : [],
          line: idx + 1,
          text: line,
        };
        return;
      }
    }

    if (!draft) return;                 // başlık bölgesi
    if (NOISE.test(line)) return;       // sayfa başlığı / altbilgi

    // Tutar/bakiye henüz okunmadıysa, salt sayı satırlarından tamamla
    const { nums, rest } = moneyTokens(line);
    if (!rest && nums.length) {
      for (const n of nums) {
        if (draft.amount === undefined) draft.amount = n;
        else if (draft.balance === undefined) draft.balance = n;
      }
      return;
    }

    // Aksi halde satırın tamamı açıklamanın devamıdır
    draft.desc.push(line);
  });

  flush();

  return {
    parser: "halkbank-pdf",
    bankCode: "halkbank",
    transactions: txs,
    totalRead: txs.length + errors.length,
    skipped: 0,
    errors,
    accountIban,
    currency,
    ...periodOf(txs.map((t) => t.date)),
  };
}

export const halkbankParser: BankParser = {
  id: "halkbank-pdf",
  bankCode: "halkbank",
  label: "Halkbank Ekstre Okuyucu",
  parse,
};
