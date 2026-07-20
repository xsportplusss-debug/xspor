
# Bankalar Modülü — Supabase Kalıcı Veritabanı ile Yeniden Tasarım

Bankalar iki alt menüye ayrılır ve tüm veriler Supabase'de (Lovable Cloud) saklanır — hangi cihazdan girersen gir aynı verileri görürsün. Diğer modüller (Faturalar, Ürünler, Kasa, Cari vb.) değişmez.

## 1) Veritabanı — 3 yeni tablo + Storage bucket

**`banks`** — banka hesap tanımları
name, logo_url, iban, account_name, currency, description, user_id.

**`bank_imports`** — yüklenen ekstre dosyaları
bank_id (FK→banks cascade), file_name, file_type, parser, tx_count, uploaded_at, user_id.

**`bank_transactions`** — banka hareketleri
bank_id (FK→banks cascade), import_id (FK→bank_imports cascade, nullable=manuel), date, description, ref_no, debit, credit, balance, currency, source (PDF/Excel/CSV/Manuel), user_id.
Mükerrer koruması: UNIQUE(user_id, bank_id, date, description, debit, credit, ref_no).

**Storage bucket `bank-logos`** — public read; upload/delete `auth.uid()` sahibine kısıtlı.

Tüm tablolarda RLS + `auth.uid() = user_id` politikaları + `updated_at` trigger.

## 2) `/bankalar/hesaplar` — Banka Ekle

- Form: **Banka Adı**, **Logo** (PNG/JPG/SVG bilgisayardan yüklenir → Storage), **IBAN**, **Hesap Adı**, **Para Birimi** (TRY/USD/EUR/GBP/CHF), **Açıklama**.
- Butonlar: **Yeni Banka**, **Kaydet**, **Düzenle**, **Sil** ("Bu bankayı silmek istediğinize emin misiniz?" AlertDialog → onaylanınca cascade delete).
- Kart görünümü: logo + banka adı + IBAN + para birimi.
- Anlık Supabase CRUD; TanStack Query ile liste otomatik güncellenir, F5'te veriler eksiksiz gelir.

## 3) `/bankalar/ekstreler` — Banka Ekstreleri

- Üstte **Banka dropdown** + tek **Ekstre Ekle** butonu (`<input type="file" accept=".pdf,.xlsx,.xls,.csv">`). Sürükle-bırak yok.
- Otomatik ayrıştırma: PDF → `parseBankPdf` (Halkbank/VakıfBank/Genel); Excel/CSV → `parseBankExcelStatement`.
- Önizleme dialog: parser adı, satır sayısı, mükerrer sayısı → **Aktar** → `bank_imports` + `bank_transactions` bulk insert.
- **Hareketler tablosu**: Tarih, Açıklama, Ref No, Borç, Alacak, Bakiye, Para Birimi.
  - Arama (açıklama + ref no), tarih & tutar sıralama, banka/borç/alacak filtreleri, sayfalama (25/50/100).
- Üstte özet kartları: Toplam Borç, Toplam Alacak, Toplam İşlem, Son Bakiye.
- **Dosya Geçmişi**: Dosya Adı, Banka, Tür, Yüklenme Tarihi, İşlem Sayısı. Her satır: **Görüntüle** (o import_id'e filtre), **Yeniden İşle** (cascade delete + yeniden yükleme istemi), **Sil** (onay + cascade delete).
- Mobil ve masaüstünde responsive; tablo yatay kaydırılır, kartlar tek/çift sütun.

## 4) Veri katmanı

- Yeni `src/lib/bank-db.ts` — Supabase CRUD helper'ları (banks / transactions / imports / uploadLogo).
- TanStack Query anahtarları: `['banks']`, `['bank-tx', filters]`, `['bank-imports']` — mutation sonrası invalidate.
- Zustand'daki `banks / bankTx / bankImports` slice'ları ve aksiyonları temizlenir.
- Eski `src/routes/bankalar.$id.tsx` silinir; hesap kartından "Hareketler" linki `/bankalar/ekstreler?bank=<id>`.

## 5) Etkilenmeyen modüller

Faturalar, Ürünler, Kasa, Cari, Gelirler/Giderler, Dashboard, Pazaryerleri, Raporlar, Takvim, Fiyat Teklifi — hiçbiri değişmez.

## Uygulama sırası

1. Supabase migration (3 tablo + RLS + trigger).
2. Storage bucket `bank-logos` + RLS.
3. `src/lib/bank-db.ts`.
4. `bankalar.hesaplar.tsx` yeniden yazılır.
5. `bankalar.ekstreler.tsx` yeniden yazılır.
6. Zustand & eski `bankalar.$id.tsx` temizlenir.
