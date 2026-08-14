/** Minimal, dependency-free XML helpers used by the EDM SOAP client (server-only). */

export function escapeXml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function unescapeXml(v: string): string {
  return v
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x?[0-9a-fA-F]+;/g, (m) => {
      const hex = m[2] === "x" || m[2] === "X";
      const code = parseInt(m.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    })
    .replace(/&amp;/g, "&");
}

/** Strip CDATA wrappers and decode entities. */
export function textOf(raw: string): string {
  const cdata = raw.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdata) return cdata[1];
  return unescapeXml(raw).trim();
}

/** Returns the inner content of the first element with the given local name. */
export function pick(xml: string, localName: string): string | null {
  const re = new RegExp(
    `<(?:[\\w.-]+:)?${localName}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?${localName}>`,
    "i",
  );
  const m = xml.match(re);
  if (m) return textOf(m[1]);
  const selfClosing = new RegExp(`<(?:[\\w.-]+:)?${localName}(?:\\s[^>]*)?/>`, "i");
  return selfClosing.test(xml) ? "" : null;
}

/** Returns the first value found among several candidate tag names. */
export function pickAny(xml: string, names: string[]): string | null {
  for (const n of names) {
    const v = pick(xml, n);
    if (v != null && v !== "") return v;
  }
  return null;
}

export function pickNum(xml: string, names: string[]): number {
  const v = pickAny(xml, names);
  if (v == null) return 0;
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Returns the raw (outer) XML of every element with the given local name. */
export function blocks(xml: string, localName: string): string[] {
  const re = new RegExp(
    `<(?:[\\w.-]+:)?${localName}(?:\\s[^>]*)?>[\\s\\S]*?</(?:[\\w.-]+:)?${localName}>`,
    "gi",
  );
  return xml.match(re) ?? [];
}

export function soapFault(xml: string): string | null {
  if (!/<(?:[\w.-]+:)?Fault[\s>]/i.test(xml)) return null;
  return (
    pickAny(xml, ["faultstring", "Text", "Reason", "ERROR_MESSAGE", "MESSAGE"]) ??
    "SOAP hatası"
  );
}
