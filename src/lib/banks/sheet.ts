// Tablo (XLSX/CSV) okuyucu — bankadan bağımsız, sütun başlıklarına göre eşleştirir.
import { isoDate, trNumber, squish, type StdTx } from "./core";

const H = {
  date: /(işlem\s*tarih|tarih|date)/i,
  time: /(saat|time)/i,
  txNo: /(işlem\s*no|dekont|referans|ref|fiş\s*no)/i,
  desc: /(açıklama|işlem\s*adı|detay|description)/i,
  amount: /(tutar|miktar|amount)/i,
  debit: /(borç|çıkış|debit)/i,
  credit: /(alacak|giriş|credit)/i,
  balance: /(bakiye|balance)/i,
};

function findHeader(rows: unknown[][]): { idx: number; map: Record<string, number> } | null {
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const cells = (rows[i] ?? []).map((c) => String(c ?? "").trim());
    const map: Record<string, number> = {};
    cells.forEach((c, j) => {
      if (!c) return;
      for (const [k, re] of Object.entries(H)) {
        if (map[k] === undefined && re.test(c)) map[k] = j;
      }
    });
    if (map.date !== undefined && (map.amount !== undefined || map.debit !== undefined || map.credit !== undefined)) {
      return { idx: i, map };
    }
  }
  return null;
}

export function parseSheet(rows: unknown[][]): { rows: StdTx[]; errors: { line: number; text: string; reason: string }[] } {
  const head = findHeader(rows);
  const errors: { line: number; text: string; reason: string }[] = [];
  if (!head) return { rows: [], errors: [{ line: 0, text: "", reason: "Başlık satırı bulunamadı" }] };

  const out: StdTx[] = [];
  const { map } = head;
  const at = (r: unknown[], k: string) => (map[k] === undefined ? undefined : r[map[k]]);

  for (let i = head.idx + 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const date = isoDate(at(r, "date"));
    if (!date) continue;
    const debit = trNumber(at(r, "debit")) ?? 0;
    const credit = trNumber(at(r, "credit")) ?? 0;
    let amount = trNumber(at(r, "amount"));
    if (amount === undefined || (debit || credit)) amount = credit - Math.abs(debit);
    if (amount === undefined || !isFinite(amount) || amount === 0) {
      errors.push({ line: i + 1, text: r.join(" ").slice(0, 120), reason: "Tutar okunamadı" });
      continue;
    }
    out.push({
      date,
      time: at(r, "time") ? String(at(r, "time")).slice(0, 5) : undefined,
      txNo: at(r, "txNo") ? String(at(r, "txNo")).trim() : undefined,
      description: squish(String(at(r, "desc") ?? "")) || "İşlem",
      amount,
      balance: trNumber(at(r, "balance")),
    });
  }
  return { rows: out, errors };
}
