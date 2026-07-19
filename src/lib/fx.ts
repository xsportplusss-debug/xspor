import { useEffect, useState } from "react";

export type FxRates = {
  USD: number; // 1 USD = ? TRY
  EUR: number; // 1 EUR = ? TRY
  GBP: number; // 1 GBP = ? TRY
  updatedAt: string;
  source: string;
};

const CACHE_KEY = "fintra:fx:v1";
const TTL_MS = 1000 * 60 * 60 * 6; // 6 saat

const FALLBACK: FxRates = { USD: 40, EUR: 43, GBP: 50, updatedAt: "", source: "varsayılan" };


async function fetchRates(): Promise<FxRates> {
  // Frankfurter API (ücretsiz, anahtar gerektirmez). doviz.com açık API sunmuyor.
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=TRY&to=USD,EUR,GBP");
    if (!res.ok) throw new Error("fx");
    const data = await res.json();
    const usdPerTry = data.rates.USD as number;
    const eurPerTry = data.rates.EUR as number;
    const gbpPerTry = data.rates.GBP as number;
    return {
      USD: +(1 / usdPerTry).toFixed(4),
      EUR: +(1 / eurPerTry).toFixed(4),
      GBP: +(1 / gbpPerTry).toFixed(4),
      updatedAt: new Date().toISOString(),
      source: "frankfurter.app",
    };
  } catch {
    return FALLBACK;
  }

}

export function useFxRates() {
  const [rates, setRates] = useState<FxRates>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return FALLBACK;
  });
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    const r = await fetchRates();
    setRates(r);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(r)); } catch {}
    setLoading(false);
  }

  useEffect(() => {
    const stale = !rates.updatedAt || Date.now() - new Date(rates.updatedAt).getTime() > TTL_MS;
    if (stale) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { rates, loading, refresh };
}

export function toTRY(amount: number, currency: "TRY" | "USD" | "EUR" | "GBP", rates: FxRates) {
  if (currency === "TRY") return amount;
  const rate = currency === "USD" ? rates.USD : currency === "EUR" ? rates.EUR : rates.GBP;
  return amount * rate;
}

