
# Fintra Genişletme Planı

Mevcut sistem korunacak. Hiçbir tablo, route veya store alanı silinmeyecek. Tüm yenilikler **modüler** ve **ek** olarak gelecek. Gerçek API bağlantıları şimdilik yok — servis katmanı hazır, mock ile çalışır, ileride kolayca gerçek API'ye bağlanır.

## 1. Servis Katmanı (yeni)
- `src/services/e-invoice/` — E-Fatura servisi (mock adapter + interface)
- `src/services/marketplaces/` — her pazaryeri için ayrı adapter (Trendyol, Hepsiburada, N11, Amazon, Pazarama, ÇiçekSepeti, PTTAVM, idefix, Turkcell Pasaj) — ortak `MarketplaceAdapter` arayüzü
- Gelecekte gerçek `fetch` çağrıları bu dosyalara eklenecek.

## 2. Store Genişletmeleri (kırılmadan)
`src/lib/store.ts` içine yeni alanlar eklenir, eskiler dokunulmaz:
- `eInvoiceConfig`, `eInvoiceLastSync`
- `marketplaceConfigs: Record<string, {...}>`
- `marketplaceOrders: MarketplaceOrder[]`
- `cashTx.category` (opsiyonel yeni alan)
- `banks.active` (opsiyonel — pasif/aktif)
- Invoice tipine opsiyonel `source: "manual" | "e-invoice"` + `uuid` (duplicate kontrolü)

## 3. Yeni Rotalar
- `/e-fatura-entegrasyon` — Config formu, "Bağlantıyı Test Et", "Faturaları Çek", son senkron tarihi
- `/pazaryerleri/ayarlar` — Her pazaryeri için API config kartı, "Bağlı" rozeti, "Siparişleri Çek"
- Mevcut pazaryeri sayfalarına yeni pazaryerleri eklenir (ÇiçekSepeti, PTTAVM, idefix, Turkcell Pasaj) — mevcutlar aynı kalır

## 4. Modül İyileştirmeleri
- **Bankalar**: Pasif yap, Düzenle, kartta Toplam Gelen/Giden/Son Hareket/Adet. CSV import eklenir (Excel/PDF zaten var).
- **Ürünler**: Kur alanı UI'dan kaldırılır (mevcut veriler bozulmaz, alan opsiyonel kalır). Yeni Ürün formu sadeleşir.
- **Fiyat Teklifi**: Para birimi seçimi USD/EUR/GBP/TL genişletilir, kur teklif özelinde çalışır (zaten benzer, GBP eklenir).
- **Kasa**: Nakit Giriş/Çıkış dialoglarına kategori seçici (Yemek, Yakıt, Kargo, Market, Personel, Ofis, Reklam, Diğer).
- **Gelirler / Giderler**: Mevcut sayfalar zenginleştirilir — kaynak filtresi (Banka/Kasa/Pazaryeri/Diğer), kategori renk kodları, toplam kart.
- **Dashboard**: Yeni kartlar (Bugünkü Ciro/Tahsilat/Gider, Bekleyen Tahsilat/Borç, Pazaryeri Siparişleri, Net Kâr, E-Fatura yeşil rozet).

## 5. Entegrasyon
- Pazaryeri siparişleri çekildiğinde otomatik `bankTx` benzeri hareket + `marketplaceOrders` kaydı → Gelir/Gider/Dashboard otomatik yansır.
- E-Fatura çekimi → mevcut `salesInvoices`/`purchaseInvoices` içine UUID/no bazlı duplicate check ile eklenir, `source: "e-invoice"` etiketi.
- Kasa/Banka hareketleri zaten Gelir/Gider'e yansıyor; kategori bilgisi de aktarılır.

## 6. Dokunulmayacaklar
- Supabase şeması (user_data JSON blob — genişleme otomatik)
- Auth akışı, Drive yedek, mevcut Excel/PDF importerlar
- Mevcut route yolları ve isimleri
- localStorage anahtarı `fintra:v1`

## Uygulama Sırası
1. Store + tip genişletmeleri
2. Servis katmanı iskeleti (mock)
3. E-Fatura rotası
4. Pazaryeri config rotası + yeni pazaryeri sayfaları
5. Kasa kategori, Ürünler UI sadeleştirme, GBP
6. Bankalar kart metrikleri + pasif
7. Gelir/Gider zenginleştirme
8. Dashboard yeni kartlar

Onaylarsan sırayla uygulamaya başlıyorum.
