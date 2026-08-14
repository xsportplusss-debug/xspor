/**
 * EDM Bilişim e-Fatura SOAP Web Service istemcisi (yalnızca sunucu tarafı).
 *
 * Endpoint, namespace ve method adları tahmin edilmez: varsayılanlar EDM'nin
 * standart SOAP yapısına göredir ve ortam değişkenleriyle (EDM_SOAP_NAMESPACE,
 * EDM_SOAP_ACTION_PREFIX, EDM_METHOD_*) EDM'nin verdiği gerçek WSDL bilgisine
 * göre değiştirilebilir. Servis adresi tamamen kullanıcının girdiği değerdir.
 */
import { blocks, escapeXml, pick, pickAny, pickNum, soapFault } from "./xml.server";

const NS = () => process.env["EDM_SOAP_NAMESPACE"] ?? "http://schemas.i2i.com/ebusiness/types";
const ACTION_PREFIX = () =>
  process.env["EDM_SOAP_ACTION_PREFIX"] ?? "http://tempuri.org/IEFaturaEDM";
const M_LOGIN = () => process.env["EDM_METHOD_LOGIN"] ?? "Login";
const M_LIST = () => process.env["EDM_METHOD_INVOICE_LIST"] ?? "GetInvoiceUUIDList";
const M_GET = () => process.env["EDM_METHOD_GET_INVOICE"] ?? "GetInvoice";

export class EdmError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function requestHeader(sessionId = "") {
  return `<REQUEST_HEADER>
      <SESSION_ID>${escapeXml(sessionId)}</SESSION_ID>
      <CLIENT_TXN_ID>${crypto.randomUUID()}</CLIENT_TXN_ID>
      <ACTION_DATE>${new Date().toISOString()}</ACTION_DATE>
      <REASON>Fintra entegrasyon</REASON>
      <APPLICATION_NAME>Fintra</APPLICATION_NAME>
      <HOSTNAME>fintra</HOSTNAME>
      <CHANNEL_NAME>WS</CHANNEL_NAME>
      <COMPRESSED>N</COMPRESSED>
    </REQUEST_HEADER>`;
}

function envelope(method: string, inner: string) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="${NS()}">
  <soapenv:Header/>
  <soapenv:Body>
    <ns:${method}>
      ${inner}
    </ns:${method}>
  </soapenv:Body>
</soapenv:Envelope>`;
}

async function callSoap(url: string, method: string, inner: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) {
    throw new EdmError("INVALID_ENDPOINT", "Geçersiz EDM Web Service adresi.");
  }
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "text/xml; charset=utf-8",
        soapaction: `${ACTION_PREFIX()}/${method}`,
      },
      body: envelope(method, inner),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    console.error("[EDM] network error", method, e);
    throw new EdmError("UNREACHABLE", "EDM Web Service adresine ulaşılamıyor.");
  }
  const text = await res.text();
  const fault = soapFault(text);
  if (fault) {
    console.error("[EDM] soap fault", method, fault);
    const lower = fault.toLowerCase();
    if (lower.includes("password") || lower.includes("user") || lower.includes("kullanıcı")) {
      throw new EdmError("AUTH", `EDM bağlantısı başarısız. Kullanıcı adı veya şifre hatalı. (${fault})`);
    }
    if (lower.includes("session")) throw new EdmError("SESSION", `EDM oturumu geçersiz: ${fault}`);
    throw new EdmError("SOAP_FAULT", `EDM servis hatası: ${fault}`);
  }
  if (!res.ok) {
    console.error("[EDM] http error", method, res.status, text.slice(0, 500));
    throw new EdmError("HTTP", `EDM servisi ${res.status} hatası döndü.`);
  }
  return text;
}

export async function edmLogin(url: string, username: string, password: string): Promise<string> {
  if (!url || !username || !password) {
    throw new EdmError("MISSING", "Servis adresi, kullanıcı adı ve şifre zorunludur.");
  }
  const xml = await callSoap(
    url,
    M_LOGIN(),
    `${requestHeader()}
      <USER_NAME>${escapeXml(username)}</USER_NAME>
      <PASSWORD>${escapeXml(password)}</PASSWORD>`,
  );
  const sessionId = pickAny(xml, ["SESSION_ID", "SessionID", "LoginResult"]);
  if (!sessionId) {
    console.error("[EDM] login response without session", xml.slice(0, 800));
    throw new EdmError("AUTH", "EDM giriş yanıtında oturum bilgisi (SESSION_ID) bulunamadı.");
  }
  return sessionId;
}

export type EdmLine = {
  line_no: number;
  name: string | null;
  code: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  discount: number;
  vat_rate: number;
  vat_amount: number;
  line_total: number;
  currency: string;
};

export type EdmInvoice = {
  invoice_uuid: string;
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_type: string | null;
  scenario: string | null;
  direction: "IN" | "OUT";
  seller_vkn: string | null;
  seller_name: string | null;
  buyer_vkn: string | null;
  buyer_name: string | null;
  tax_office: string | null;
  currency: string;
  line_extension_amount: number;
  discount_amount: number;
  tax_base: number;
  tax_total: number;
  grand_total: number;
  payable_amount: number;
  status: string | null;
  gib_status_code: string | null;
  gib_status_desc: string | null;
  edm_status: string | null;
  ubl_xml: string | null;
  issued_at: string | null;
  lines: EdmLine[];
};

function isoDate(v: string | null): string | null {
  if (!v) return null;
  const m = v.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const tr = v.match(/(\d{2})[./](\d{2})[./](\d{4})/);
  if (tr) return `${tr[3]}-${tr[2]}-${tr[1]}`;
  return null;
}

function parseLines(xml: string, currency: string): EdmLine[] {
  const raw = [
    ...blocks(xml, "InvoiceLine"),
    ...blocks(xml, "INVOICE_LINE"),
    ...blocks(xml, "LINE"),
  ];
  return raw.map((b, i) => ({
    line_no: Number(pickAny(b, ["ID", "LINE_NO"]) ?? i + 1) || i + 1,
    name: pickAny(b, ["Name", "ITEM_NAME", "PRODUCT_NAME", "DESCRIPTION"]),
    code: pickAny(b, ["SellersItemIdentification", "ITEM_CODE", "PRODUCT_CODE", "SKU"]),
    quantity: pickNum(b, ["InvoicedQuantity", "QUANTITY", "AMOUNT"]),
    unit: pickAny(b, ["unitCode", "UNIT", "UNIT_CODE"]),
    unit_price: pickNum(b, ["PriceAmount", "UNIT_PRICE"]),
    discount: pickNum(b, ["AllowanceTotalAmount", "DISCOUNT", "DISCOUNT_AMOUNT"]),
    vat_rate: pickNum(b, ["Percent", "VAT_RATE", "TAX_RATE"]),
    vat_amount: pickNum(b, ["TaxAmount", "VAT_AMOUNT", "TAX_AMOUNT"]),
    line_total: pickNum(b, ["LineExtensionAmount", "LINE_TOTAL", "TOTAL"]),
    currency,
  }));
}

function parseInvoice(block: string, direction: "IN" | "OUT", ubl: string | null): EdmInvoice | null {
  const source = ubl ?? block;
  const invoice_uuid = pickAny(block, ["UUID", "ETTN", "InvoiceUUID"]) ?? pickAny(source, ["UUID"]);
  if (!invoice_uuid) return null;
  const currency = pickAny(source, ["DocumentCurrencyCode", "CURRENCY_CODE", "CURRENCY"]) ?? "TRY";
  return {
    invoice_uuid,
    invoice_number: pickAny(block, ["ID", "INVOICE_ID", "INVOICE_NUMBER", "DOCUMENT_ID"]),
    invoice_date: isoDate(pickAny(block, ["IssueDate", "ISSUE_DATE", "INVOICE_DATE", "CREATE_DATE"])),
    invoice_type: pickAny(block, ["InvoiceTypeCode", "INVOICE_TYPE", "DOCUMENT_TYPE"]),
    scenario: pickAny(block, ["ProfileID", "PROFILE_ID", "SCENARIO"]),
    direction,
    seller_vkn: pickAny(block, ["SENDER_IDENTIFIER", "SUPPLIER_VKN", "SELLER_VKN", "FROM"]),
    seller_name: pickAny(block, ["SENDER_NAME", "SUPPLIER_NAME", "SELLER_NAME", "TITLE"]),
    buyer_vkn: pickAny(block, ["RECEIVER_IDENTIFIER", "CUSTOMER_VKN", "BUYER_VKN", "TO"]),
    buyer_name: pickAny(block, ["RECEIVER_NAME", "CUSTOMER_NAME", "BUYER_NAME"]),
    tax_office: pickAny(source, ["TaxSchemeName", "TAX_OFFICE", "TAX_SCHEME"]),
    currency,
    line_extension_amount: pickNum(source, ["LineExtensionAmount", "LINE_EXTENSION_AMOUNT"]),
    discount_amount: pickNum(source, ["AllowanceTotalAmount", "DISCOUNT_AMOUNT"]),
    tax_base: pickNum(source, ["TaxableAmount", "TAX_BASE", "TAXABLE_AMOUNT"]),
    tax_total: pickNum(source, ["TaxAmount", "TAX_TOTAL", "VAT_TOTAL"]),
    grand_total: pickNum(source, ["TaxInclusiveAmount", "GRAND_TOTAL", "TOTAL_AMOUNT", "PAYABLE_AMOUNT"]),
    payable_amount: pickNum(source, ["PayableAmount", "PAYABLE_AMOUNT", "GRAND_TOTAL"]),
    status: pickAny(block, ["STATUS", "INVOICE_STATUS"]),
    gib_status_code: pickAny(block, ["GIB_STATUS_CODE", "STATUS_CODE"]),
    gib_status_desc: pickAny(block, ["GIB_STATUS_DESCRIPTION", "STATUS_DESCRIPTION", "STATUS_DETAIL"]),
    edm_status: pickAny(block, ["EDM_STATUS", "ENVELOPE_STATUS"]),
    ubl_xml: ubl,
    issued_at: pickAny(block, ["CREATE_DATE", "CREATED_DATE", "IssueTime"]),
    lines: parseLines(source, currency),
  };
}

/** EDM'den belirtilen tarih aralığındaki faturaları çeker. */
export async function edmFetchInvoices(opts: {
  url: string;
  sessionId: string;
  direction: "IN" | "OUT";
  startDate: string;
  endDate: string;
}): Promise<EdmInvoice[]> {
  const listXml = await callSoap(
    opts.url,
    M_LIST(),
    `${requestHeader(opts.sessionId)}
      <SEARCH_KEY>
        <LIMIT>1000</LIMIT>
        <DIRECTION>${opts.direction}</DIRECTION>
        <START_DATE>${opts.startDate}</START_DATE>
        <END_DATE>${opts.endDate}</END_DATE>
        <READ_INCLUDED>true</READ_INCLUDED>
      </SEARCH_KEY>`,
  );

  const invoiceBlocks = [
    ...blocks(listXml, "INVOICE"),
    ...blocks(listXml, "Invoice"),
    ...blocks(listXml, "INVOICE_HEADER"),
  ];
  const out: EdmInvoice[] = [];
  for (const b of invoiceBlocks) {
    const parsed = parseInvoice(b, opts.direction, null);
    if (parsed) out.push(parsed);
  }
  return out;
}

/** Tek bir faturanın UBL/XML içeriğini çeker (servis destekliyorsa). */
export async function edmFetchInvoiceUbl(opts: {
  url: string;
  sessionId: string;
  uuid: string;
}): Promise<string | null> {
  try {
    const xml = await callSoap(
      opts.url,
      M_GET(),
      `${requestHeader(opts.sessionId)}
      <INVOICE>
        <UUID>${escapeXml(opts.uuid)}</UUID>
      </INVOICE>`,
    );
    const content = pick(xml, "CONTENT") ?? pick(xml, "XML_CONTENT") ?? pick(xml, "DOCUMENT_DATA");
    if (!content) return null;
    // EDM içeriği base64 olarak dönebilir.
    if (/^[A-Za-z0-9+/=\s]+$/.test(content) && content.length > 100 && !content.includes("<")) {
      try {
        return new TextDecoder().decode(
          Uint8Array.from(atob(content.replace(/\s/g, "")), (c) => c.charCodeAt(0)),
        );
      } catch {
        return content;
      }
    }
    return content;
  } catch (e) {
    console.error("[EDM] UBL alınamadı", opts.uuid, e);
    return null;
  }
}
