// Pazar yeri adapter'ları (mock).
// Yeni pazar yeri eklemek için `MARKETPLACES` listesine bir kayıt ekleyin.
// Gerçek entegrasyon için `fetchOrders` içine gerçek API çağrısı ekleyin.

import type { MarketplaceConfig, MarketplaceOrder } from "@/lib/store";

export type MarketplaceMeta = {
  id: string;
  name: string;
  color: string; // hex
  website: string;
  authFields?: Partial<Record<keyof MarketplaceConfig, string>>; // opsiyonel açıklama
};

export const MARKETPLACES: MarketplaceMeta[] = [
  { id: "trendyol",       name: "Trendyol",       color: "#F27A1A", website: "trendyol.com" },
  { id: "hepsiburada",    name: "Hepsiburada",    color: "#FF6000", website: "hepsiburada.com" },
  { id: "n11",            name: "N11",            color: "#D42020", website: "n11.com" },
  { id: "amazon",         name: "Amazon",         color: "#FF9900", website: "amazon.com.tr" },
  { id: "pazarama",       name: "Pazarama",       color: "#7B2CBF", website: "pazarama.com" },
  { id: "ciceksepeti",    name: "ÇiçekSepeti",    color: "#E5007D", website: "ciceksepeti.com" },
  { id: "pttavm",         name: "PTTAVM",         color: "#F7C700", website: "pttavm.com" },
  { id: "idefix",         name: "idefix",         color: "#00A651", website: "idefix.com" },
  { id: "turkcell-pasaj", name: "Turkcell Pasaj", color: "#FFC800", website: "pasaj.com.tr" },
];

export function getMarketplace(id: string): MarketplaceMeta | undefined {
  return MARKETPLACES.find((m) => m.id === id);
}

export async function testMarketplaceConnection(_id: string, cfg: MarketplaceConfig): Promise<{ ok: boolean; message: string }> {
  await new Promise((r) => setTimeout(r, 500));
  if (!cfg.apiKey || !cfg.apiSecret || !cfg.merchantId) {
    return { ok: false, message: "API Key, Secret ve Merchant ID gereklidir" };
  }
  return { ok: true, message: "Bağlantı başarılı" };
}

export async function fetchOrders(id: string, cfg: MarketplaceConfig): Promise<Omit<MarketplaceOrder, "id">[]> {
  await new Promise((r) => setTimeout(r, 800));
  // Şimdilik mock — gerçek API bağlanana kadar boş liste dönüyor.
  // Örn. Trendyol: GET https://api.trendyol.com/sapigw/suppliers/{merchantId}/orders
  void cfg;
  void id;
  return [];
}
