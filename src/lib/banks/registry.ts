// Banka kayıt defteri — her banka kendi parser'ını kullanır.
// Yeni banka eklemek için: parsers/<banka>.ts oluştur + aşağıdaki listeye ekle.
import * as XLSX from "xlsx";
import { extractPdfLines } from "./pdf";
import { parseSheet } from "./sheet";
import { dedupeWithin, type BankParser, type ParseResult, type ParserInput } from "./core";
import { halkbankParser } from "./parsers/halkbank";
import { vakifbankParser } from "./parsers/vakifbank";
import { ziraatParser } from "./parsers/ziraat";
import { garantiParser } from "./parsers/garanti";
import { isbankasiParser } from "./parsers/isbankasi";
import { akbankParser } from "./parsers/akbank";
import { yapikrediParser } from "./parsers/yapikredi";
import { denizbankParser } from "./parsers/denizbank";

export type BankDef = {
  code: string;
  label: string;
  color: string;
  /** Dosya doğrulaması için isim/kısaltma/IBAN ipuçları. */
  aliases: RegExp;
  parser: BankParser;
  /** Hareketler ekranı sütun düzeni. */
  layout: "halkbank" | "vakifbank";
};

export const BANK_DEFS: BankDef[] = [
  {
    code: "halkbank", label: "Halkbank", color: "#00539F", layout: "halkbank",
    aliases: /halkbank|halk bankas|TRHBTR2A|T\.? ?HALK/i, parser: halkbankParser,
  },
  {
    code: "vakifbank", label: "VakıfBank", color: "#F9C440", layout: "vakifbank",
    aliases: /vak[ıi]fbank|vak[ıi]flar bankas|TVBATR2A/i, parser: vakifbankParser,
  },
  {
    code: "ziraat", label: "Ziraat Bankası", color: "#E3001B", layout: "halkbank",
    aliases: /ziraat|TCZBTR2A/i, parser: ziraatParser,
  },
  {
    code: "garanti", label: "Garanti BBVA", color: "#00A94F", layout: "halkbank",
    aliases: /garanti|bbva|TGBATRIS/i, parser: garantiParser,
  },
  {
    code: "isbankasi", label: "İş Bankası", color: "#0B4EA2", layout: "halkbank",
    aliases: /i[şs] bankas|isbank|ISBKTRIS/i, parser: isbankasiParser,
  },
  {
    code: "akbank", label: "Akbank", color: "#E30613", layout: "halkbank",
    aliases: /akbank|AKBKTRIS/i, parser: akbankParser,
  },
  {
    code: "yapikredi", label: "Yapı Kredi", color: "#004B93", layout: "halkbank",
    aliases: /yap[ıi] ?(ve )?kredi|YAPITRIS/i, parser: yapikrediParser,
  },
  {
    code: "denizbank", label: "DenizBank", color: "#00539F", layout: "vakifbank",
    aliases: /denizbank|DENITRIS/i, parser: denizbankParser,
  },
];

export function bankDef(code?: string | null): BankDef | undefined {
  return BANK_DEFS.find((b) => b.code === code);
}

/** Banka adından kod tahmini (eski kayıtlar için). */
export function codeFromName(name: string): string | undefined {
  return BANK_DEFS.find((b) => b.aliases.test(name))?.code;
}

export const ACCEPT = ".pdf,.xlsx,.xls,.csv";

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i).toLowerCase();
}

async function buildInput(file: File, onProgress?: (p: number, t: number) => void): Promise<ParserInput> {
  const ext = extOf(file.name);
  if (ext === ".pdf") {
    const { lines, text } = await extractPdfLines(file, onProgress);
    return { kind: "pdf", fileName: file.name, lines, text, rows: [] };
  }
  if (ext === ".csv") {
    const text = await file.text();
    const wb = XLSX.read(text, { type: "string", raw: false, cellDates: true });
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], {
      header: 1, raw: false, defval: "",
    }) as unknown[][];
    return { kind: "sheet", fileName: file.name, lines: [], text, rows };
  }
  if (ext === ".xls" || ext === ".xlsx") {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    let rows: unknown[][] = [];
    for (const sn of wb.SheetNames) {
      const r = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, raw: true, defval: "" }) as unknown[][];
      if (r.length > rows.length) rows = r;
    }
    const text = rows.slice(0, 60).map((r) => r.join(" ")).join("\n");
    return { kind: "sheet", fileName: file.name, lines: [], text, rows };
  }
  throw new Error("Yalnızca PDF, XLSX, XLS veya CSV yükleyebilirsiniz.");
}

export type ImportReport = ParseResult & {
  fileName: string;
  fileSize: number;
  parserLabel: string;
  duplicatesInFile: number;
};

/** Seçilen bankanın parser'ı ile dosyayı okur. Başka bankanın parser'ı denenmez. */
export async function parseForBank(
  file: File,
  def: BankDef,
  onProgress?: (page: number, total: number) => void,
): Promise<ImportReport> {
  const input = await buildInput(file, onProgress);

  // Dosya doğrulama: içerik seçilen bankaya ait mi?
  if (!def.aliases.test(input.text) && !def.aliases.test(file.name)) {
    throw new Error(
      `Yüklediğiniz ekstre ${def.label} bankasına ait görünmüyor. Lütfen doğru bankayı seçin veya doğru dosyayı yükleyin.`,
    );
  }

  const result: ParseResult =
    input.kind === "sheet"
      ? (() => {
          const s = parseSheet(input.rows);
          return {
            parser: `${def.code}-sheet`,
            bankCode: def.code,
            transactions: s.rows,
            totalRead: s.rows.length + s.errors.length,
            skipped: 0,
            errors: s.errors,
          } satisfies ParseResult;
        })()
      : def.parser.parse(input);

  const totalRead = result.totalRead;
  const { rows, skipped } = dedupeWithin(result.transactions);

  // Ekstredeki satır sırası korunur: yalnızca tarih bazında kararlı (stable)
  // sıralama yapılır, aynı gün içindeki satırların dosyadaki sırası bozulmaz.
  const withIndex = rows.map((r, i) => ({ r, i }));
  withIndex.sort((a, b) => (a.r.date === b.r.date ? a.i - b.i : a.r.date.localeCompare(b.r.date)));
  const ordered = withIndex.map(({ r }, i) => ({ ...r, order: i + 1 }));

  return {
    ...result,
    transactions: ordered,

    totalRead,
    skipped,
    duplicatesInFile: skipped,
    fileName: file.name,
    fileSize: file.size,
    parserLabel: input.kind === "sheet" ? `${def.label} Tablo Okuyucu` : def.parser.label,
  };
}
