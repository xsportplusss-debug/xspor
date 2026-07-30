// Parser kayıt defteri (registry).
// Yeni banka eklemek için: parser dosyasını yaz + aşağıdaki listeye ekle.

import * as XLSX from "xlsx";
import type { BankParser, ParseOutput, ParserInput, RawTx } from "./types";
import { extractPdfLines } from "./pdf-text";
import { vakifbankPdfParser } from "./vakifbank";
import { halkbankPdfParser } from "./halkbank";
import { genericPdfParser } from "./generic-pdf";
import { excelParser } from "./excel";
import { dedupKey } from "./utils";

export type { RawTx, ParseOutput, BankParser, ParserInput } from "./types";
export { dedupKey } from "./utils";

/** Sıra önemlidir: özel parser'lar önce, genel olanlar sonra. */
export const PARSERS: BankParser[] = [
  vakifbankPdfParser,
  halkbankPdfParser,
  excelParser,
  genericPdfParser,
];

export const SUPPORTED_EXT = [".pdf", ".xls", ".xlsx", ".csv"] as const;

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i).toLowerCase();
}

async function buildInput(file: File): Promise<ParserInput> {
  const ext = extOf(file.name);
  if (ext === ".pdf") {
    const { lines, text } = await extractPdfLines(file);
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
      const r = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], {
        header: 1, raw: true, defval: "",
      }) as unknown[][];
      if (r.length > rows.length) rows = r;
    }
    const text = rows.slice(0, 40).map((r) => r.join(" ")).join("\n");
    return { kind: "sheet", fileName: file.name, lines: [], text, rows };
  }
  throw new Error("Desteklenmeyen dosya biçimi. PDF, XLSX, XLS veya CSV yükleyin.");
}

export type StatementParseResult = ParseOutput & {
  fileName: string;
  fileSize: number;
  parserLabel: string;
};

export async function parseStatementFile(file: File): Promise<StatementParseResult> {
  const input = await buildInput(file);
  const parser = PARSERS.find((p) => p.detect(input));
  if (!parser) throw new Error("Bu dosya için uygun bir okuyucu bulunamadı.");
  const out = parser.parse(input);

  // Tanınan banka parser'ı satır bulamadıysa genel parser'a düş.
  let final = out;
  if (!out.transactions.length && input.kind === "pdf" && parser.id !== "generic-pdf") {
    const fallback = genericPdfParser.parse(input);
    if (fallback.transactions.length) final = fallback;
  }

  const sorted = [...final.transactions].sort((a, b) =>
    a.date === b.date ? (a.time ?? "").localeCompare(b.time ?? "") : a.date.localeCompare(b.date),
  );

  return {
    ...final,
    transactions: sorted,
    fileName: file.name,
    fileSize: file.size,
    parserLabel: PARSERS.find((p) => p.id === final.parser)?.label ?? final.parser,
  };
}

/** Dosya içindeki mükerrer satırları temizler. */
export function dedupeWithin(list: RawTx[]): RawTx[] {
  const seen = new Set<string>();
  const out: RawTx[] = [];
  for (const t of list) {
    const k = dedupKey(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}
