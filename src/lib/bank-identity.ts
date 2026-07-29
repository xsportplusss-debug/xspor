// Bank identity registry + validation helpers for statement uploads.
// Used to block wrong-bank files (by filename and by content) before parsing.
import * as XLSX from "xlsx";

export type BankIdentity = {
  id: string;
  displayName: string;
  aliases: string[]; // matched against normalized text
};

export const BANK_IDENTITIES: BankIdentity[] = [
  {
    id: "vakifbank",
    displayName: "VakıfBank",
    aliases: ["vakifbank", "vakif bank", "t vakiflar bankasi", "turkiye vakiflar bankasi", "tvb", "tvbatr2a"],
  },
  {
    id: "halkbank",
    displayName: "Halkbank",
    aliases: ["halkbank", "halk bankasi", "turkiye halk bankasi", "t halk bankasi", "trhbtr2a"],
  },
  {
    id: "ziraat",
    displayName: "Ziraat Bankası",
    aliases: ["ziraat", "ziraat bankasi", "t c ziraat bankasi", "tc ziraat bankasi", "tcziraat", "tcztr2a"],
  },
  {
    id: "garanti",
    displayName: "Garanti BBVA",
    aliases: ["garanti", "garanti bbva", "garanti bankasi", "tgbatr2a"],
  },
  {
    id: "isbank",
    displayName: "İş Bankası",
    aliases: ["is bankasi", "isbank", "turkiye is bankasi", "t is bankasi", "isbktris", "isbktr"],
  },
  {
    id: "akbank",
    displayName: "Akbank",
    aliases: ["akbank", "akbank tas", "asnbtris"],
  },
  {
    id: "kuveytturk",
    displayName: "Kuveyt Türk",
    aliases: ["kuveyt turk", "kuveytturk", "kuveyt turk katilim", "kuveyt turk katilim bankasi", "kttrtr"],
  },
  {
    id: "denizbank",
    displayName: "DenizBank",
    aliases: ["denizbank", "deniz bank", "dnzbtr"],
  },
  {
    id: "ing",
    displayName: "ING",
    aliases: ["ing", "ing bank", "ing bank as", "ingbtr"],
  },
  {
    id: "qnb",
    displayName: "QNB",
    aliases: ["qnb", "qnb finansbank", "finansbank", "finstris"],
  },
  {
    id: "teb",
    displayName: "TEB",
    aliases: ["teb", "turk ekonomi bankasi", "t ekonomi bankasi", "tebutr"],
  },
];

/** Lowercase, strip Turkish diacritics, collapse punctuation to spaces. */
export function normalize(input: string): string {
  if (!input) return "";
  const map: Record<string, string> = {
    "ı": "i", "İ": "i", "I": "i",
    "ş": "s", "Ş": "s",
    "ç": "c", "Ç": "c",
    "ğ": "g", "Ğ": "g",
    "ü": "u", "Ü": "u",
    "ö": "o", "Ö": "o",
    "â": "a", "Â": "a",
    "î": "i", "Î": "i",
    "û": "u", "Û": "u",
  };
  let s = input.replace(/[ıİIşŞçÇğĞüÜöÖâÂîÎûÛ]/g, (ch) => map[ch] ?? ch);
  s = s.toLowerCase();
  s = s.replace(/[_\-.,;:()\[\]{}/\\|"'`*+#!?@%&=<>\r\n\t]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function aliasRegex(alias: string): RegExp {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
}

export function matchesBank(text: string, bank: BankIdentity): boolean {
  const n = normalize(text);
  if (!n) return false;
  return bank.aliases.some((a) => aliasRegex(a).test(n));
}

export function detectBanks(text: string): BankIdentity[] {
  const n = normalize(text);
  if (!n) return [];
  return BANK_IDENTITIES.filter((b) => b.aliases.some((a) => aliasRegex(a).test(n)));
}

/** Resolve a user-defined bank name (e.g. store `banks[i].name`) to a known identity. */
export function findBankIdentity(bankName: string): BankIdentity | null {
  const n = normalize(bankName);
  if (!n) return null;
  // Prefer identity whose alias is contained in the name (or vice versa).
  for (const b of BANK_IDENTITIES) {
    if (b.aliases.some((a) => aliasRegex(a).test(n))) return b;
  }
  return null;
}

/** Extract a short text sample from the head of a statement file for content validation. */
export async function extractHeadText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".pdf")) return await extractPdfHead(file, 2);
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) return extractXlsxHead(file);
    // csv / mt940 / sta / txt — read as text
    return await readTextSlice(file, 8192);
  } catch (e) {
    throw new Error(`Dosya okunamadı: bozuk, şifreli veya desteklenmeyen format olabilir. (${(e as Error).message})`);
  }
}

async function readTextSlice(file: File, bytes: number): Promise<string> {
  const blob = file.slice(0, Math.min(file.size, bytes));
  return await blob.text();
}

async function extractXlsxHead(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const parts: string[] = [];
  for (const sn of wb.SheetNames.slice(0, 2)) {
    parts.push(sn);
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, raw: false, defval: "" });
    for (const row of rows.slice(0, 30)) {
      parts.push((row as unknown[]).map((c) => String(c ?? "")).join(" "));
    }
  }
  return parts.join("\n");
}

async function extractPdfHead(file: File, maxPages: number): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.mjs?url");
  (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
    (worker as { default: string }).default;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages = Math.min(doc.numPages, maxPages);
  const parts: string[] = [];
  for (let p = 1; p <= pages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    parts.push((tc.items as { str: string }[]).map((it) => it.str).join(" "));
  }
  return parts.join("\n");
}

export type ValidateResult =
  | { ok: true }
  | { ok: false; reason: "filename" | "content" | "empty"; message: string };

export async function validateStatementForBank(
  file: File,
  selectedBankName: string
): Promise<ValidateResult> {
  const identity = findBankIdentity(selectedBankName);
  // Unknown/custom bank: skip strict validation.
  if (!identity) return { ok: true };

  // 1. Filename check
  if (!matchesBank(file.name, identity)) {
    const others = detectBanks(file.name).filter((b) => b.id !== identity.id);
    const hint = others.length ? ` (Tespit edilen: ${others.map((b) => b.displayName).join(", ")})` : "";
    return {
      ok: false,
      reason: "filename",
      message: `Seçtiğiniz dosya adı ${identity.displayName}'a ait görünmüyor. Lütfen doğru bankaya ait ekstreyi seçiniz.${hint}`,
    };
  }

  // 2. Content check
  let head = "";
  try {
    head = await extractHeadText(file);
  } catch (e) {
    return { ok: false, reason: "empty", message: (e as Error).message };
  }
  if (!head || !normalize(head)) {
    return {
      ok: false,
      reason: "empty",
      message: "Dosya içeriği okunamadı, tarayıcı çıktısı olabilir. Doğrulama yapılamadığından yükleme iptal edildi.",
    };
  }
  if (!matchesBank(head, identity)) {
    const others = detectBanks(head).filter((b) => b.id !== identity.id);
    const hint = others.length ? ` (Tespit edilen: ${others.map((b) => b.displayName).join(", ")})` : "";
    return {
      ok: false,
      reason: "content",
      message: `Dosya içeriği ${identity.displayName}'a ait değildir.${hint}`,
    };
  }

  return { ok: true };
}
