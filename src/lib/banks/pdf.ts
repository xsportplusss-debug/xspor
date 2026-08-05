// PDF metin çıkarımı (OCR yok — gömülü gerçek metin okunur).
// Sayfa sayfa işlenir, sayfa nesneleri hemen serbest bırakılır (5000+ hareket için).

export type PdfExtract = { lines: string[]; text: string; pages: number };

export async function extractPdfLines(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<PdfExtract> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.mjs?url");
  (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
    (worker as { default: string }).default;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const lines: string[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const rows = new Map<number, { x: number; str: string }[]>();

    for (const item of tc.items as { str: string; transform: number[] }[]) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      let key = y;
      for (const k of rows.keys()) {
        if (Math.abs(k - y) <= 2) { key = k; break; }
      }
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key)!.push({ x: item.transform[4], str: item.str });
    }

    for (const y of [...rows.keys()].sort((a, b) => b - a)) {
      const line = rows
        .get(y)!
        .sort((a, b) => a.x - b.x)
        .map((c) => c.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (line) lines.push(line);
    }

    page.cleanup();
    onProgress?.(p, doc.numPages);
  }

  const pages = doc.numPages;
  return { lines, text: lines.join("\n"), pages };
}
