
# Bulut Senkron Planı

Tüm verileri Lovable Cloud'a taşıyıp e-posta/şifre girişi ile korumak. Böylece hangi cihazdan girerseniz girin aynı veriyi görürsünüz.

## 1. Altyapı
- **Lovable Cloud etkinleştir** (Supabase tabanlı — sizden ek hesap istemez).
- E-posta + şifre girişi (`/auth` sayfası — kayıt + giriş + çıkış). "Tek kullanıcı" tercihiniz gereği yeni kayıtları kapatma seçeneği: ilk kayıttan sonra kayıt formu gizlenir; sadece siz girersiniz.
- `_authenticated` layout (mevcut şablon otomatik gelir) — tüm sayfalar giriş gerektirir.

## 2. Veritabanı tabloları (her tabloda `user_id` + RLS "sadece kendi verin")
- `sales_invoices`, `purchase_invoices`
- `cari` (müşteriler)
- `products`, `categories`
- `banks`, `bank_tx`
- `cash_registers`, `cash_tx`
- `company_settings` (firma bilgileri + logo)
- `quotes` (fiyat teklifleri — kaydet/önizle özelliği için)

## 3. Kod tarafı
- Mevcut Zustand store'u **server function**'lara çevrilecek — her CRUD Supabase'e yazar, TanStack Query ile cache/invalidate.
- **Otomatik migrasyon**: giriş yapınca `localStorage`'daki `fintra:v1` verisi bulutta boşsa tek seferlik yüklenir, sonra flag ile devre dışı.
- Firma logosu Cloud Storage'a yüklenir → URL DB'de saklanır.
- Fiyat Teklifi: "Kaydet" ve "Önizleme" butonları — kayıtlı teklifleri listeden açıp düzenleyebilirsiniz.

## 4. Kapsam
- ✅ Tüm liste sayfaları (faturalar, cari, ürünler, bankalar, kasa, teklifler) buluttan okuyacak.
- ✅ Excel/PDF/XML import bulut kayıtları oluşturacak.
- ✅ Telefon + masaüstü aynı anda güncel — bir cihazda ekleyince diğerinde 1-2 sn'de görünür.
- ❌ Gerçek zamanlı (websocket) push kapsam dışı — sayfa yenilendiğinde/route değişince güncel; istersen ekleriz.
- ❌ xsportplus.com.tr'ye gömme (iframe/subdomain) ayrı bir iş — panel kendi URL'sinde kalır.

## Teknik notlar
- Auth: Supabase Auth (email+password).
- Data API: TanStack `createServerFn` + `requireSupabaseAuth`; RLS `auth.uid() = user_id`.
- Cache: TanStack Query, mutation sonrası `invalidateQueries`.
- Şema değişikliği migration'ları Lovable Cloud üzerinden.

Onaylarsan Lovable Cloud'u açıp inşaya başlıyorum.
