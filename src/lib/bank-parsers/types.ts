// Ortak veri modeli — tüm banka parser'ları bu tipi üretir.

export type RawTx = {
  date: string;              // ISO YYYY-MM-DD (işlem tarihi)
  valueDate?: string;        // valör / hesaba geçiş tarihi
  time?: string;             // HH:MM
  description: string;
  operation?: string;        // İşlem türü / işlem adı
  docNo?: string;            // Dekont no
  refNo?: string;            // Referans no
  debit?: number;            // pozitif tutar (çıkış)
  credit?: number;           // pozitif tutar (giriş)
  amount: number;            // + giriş, - çıkış
  balance?: number;
  currency?: string;
  branch?: string;
  counterparty?: string;
  counterpartyIban?: string;
  raw?: Record<string, unknown>;
};

export type ParseOutput = {
  parser: string;            // "vakifbank-pdf" gibi
  transactions: RawTx[];
  periodStart?: string;
  periodEnd?: string;
  accountIban?: string;
  currency?: string;
  warnings?: string[];
};

export type BankParser = {
  id: string;
  bankKey: string;           // "vakifbank" | "halkbank" | "generic"
  label: string;
  /** Ham metin (PDF) veya tablo satırları (Excel) üzerinden bu parser uygun mu? */
  detect: (input: ParserInput) => boolean;
  parse: (input: ParserInput) => ParseOutput;
};

export type ParserInput = {
  kind: "pdf" | "sheet";
  fileName: string;
  /** PDF: satır satır metin. Excel/CSV: yok. */
  lines: string[];
  text: string;
  /** Excel/CSV: satır dizisi. */
  rows: unknown[][];
};
