import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";

type Row = Record<string, unknown>;

function toSheet(name: string, rows: Row[]) {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ bilgi: "Veri yok" }]);
  return { name: name.slice(0, 31), ws };
}

function buildWorkbook(data: Record<string, unknown>, company: Record<string, unknown>) {
  const wb = XLSX.utils.book_new();
  const sections: Array<[string, Row[]]> = [
    ["Satis Faturalari", (data.salesInvoices as Row[]) ?? []],
    ["Alis Faturalari", (data.purchaseInvoices as Row[]) ?? []],
    ["Cari", (data.cariList as Row[]) ?? []],
    ["Urunler", (data.products as Row[]) ?? []],
    ["Kategoriler", (data.categories as Row[]) ?? []],
    ["Bankalar", (data.banks as Row[]) ?? []],
    ["Banka Hareketleri", (data.bankTx as Row[]) ?? []],
    ["Kasa", (data.cashRegisters as Row[]) ?? []],
    ["Kasa Hareketleri", (data.cashTx as Row[]) ?? []],
    ["Firma", [company as Row]],
  ];
  for (const [name, rows] of sections) {
    const { ws } = toSheet(name, rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

async function uploadToDrive(fileName: string, bytes: ArrayBuffer) {
  const metadata = { name: fileName, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  const boundary = "----fintra-" + Math.random().toString(36).slice(2);
  const enc = new TextEncoder();
  const head = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: ${metadata.mimeType}\r\n\r\n`,
  );
  const tail = enc.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.byteLength + bytes.byteLength + tail.byteLength);
  body.set(head, 0);
  body.set(new Uint8Array(bytes), head.byteLength);
  body.set(tail, head.byteLength + bytes.byteLength);

  const res = await fetch(`${GATEWAY}/upload/drive/v3/files?uploadType=multipart`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": process.env.GOOGLE_DRIVE_API_KEY!,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive upload failed [${res.status}]: ${text}`);
  }
  return res.json() as Promise<{ id: string; name: string }>;
}

async function runBackup() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: rows, error } = await supabase.from("user_data").select("user_id, data, company");
  if (error) throw error;

  const uploaded: Array<{ user_id: string; file: string; id: string }> = [];
  const stamp = new Date().toISOString().slice(0, 10);
  for (const row of rows ?? []) {
    const bytes = buildWorkbook(
      (row.data as Record<string, unknown>) ?? {},
      (row.company as Record<string, unknown>) ?? {},
    );
    const fileName = `Fintra-Yedek-${stamp}.xlsx`;
    const result = await uploadToDrive(fileName, bytes);
    uploaded.push({ user_id: row.user_id as string, file: result.name, id: result.id });
  }
  return { uploaded, count: uploaded.length, date: stamp };
}

export const Route = createFileRoute("/api/public/hooks/drive-backup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? "";
        if (apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const result = await runBackup();
          return new Response(JSON.stringify({ ok: true, ...result }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("drive-backup failed", e);
          return new Response(
            JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
      GET: async ({ request }) => {
        const apikey = new URL(request.url).searchParams.get("apikey") ?? "";
        if (apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const result = await runBackup();
          return new Response(JSON.stringify({ ok: true, ...result }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
