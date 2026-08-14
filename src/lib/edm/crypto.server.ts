/** AES-GCM encryption for integration credentials (server-only). */

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function key(): Promise<CryptoKey> {
  const secret = process.env["EDM_ENCRYPTION_KEY"];
  if (!secret) throw new Error("EDM_ENCRYPTION_KEY tanımlı değil");
  const material = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", material, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await key(),
    new TextEncoder().encode(plain),
  );
  return `v1:${b64encode(iv)}:${b64encode(new Uint8Array(buf))}`;
}

export async function decryptSecret(payload: string | null | undefined): Promise<string> {
  if (!payload) return "";
  const [version, ivB64, dataB64] = payload.split(":");
  if (version !== "v1" || !ivB64 || !dataB64) throw new Error("Şifre çözülemedi (bozuk kayıt)");
  const buf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(ivB64) },
    await key(),
    b64decode(dataB64),
  );
  return new TextDecoder().decode(buf);
}
