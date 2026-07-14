
# Fintra — Fonksiyonel Güncellemeler + Boş Başlangıç

Frontend-only kalır. **Tüm örnek (mock) veriler silinir** — panel tamamen boş açılır. Kullanıcı ekledikçe / import ettikçe dolar. Kalıcılık için `localStorage`.

## 1. Global veri katmanı
- `src/lib/store.ts` — Zustand + persist. Tüm koleksiyonlar `[]` başlar:
  `salesInvoices`, `purchaseInvoices`, `cariList`, `products`, `categories`,
  `banks`, `bankTx`, `cashRegisters`, `cashTx`.
- Her koleksiyon için `add`, `update`, `remove`, `bulkAdd`.
- `deriveIncomeExpense()` banka + kasa hareketlerinden gelir/gider özeti üretir.
- `src/lib/mock-data.ts` içindeki örnek diziler kaldırılır; sadece `fmt`, `fmtTL` gibi yardımcılar `src/lib/format.ts`'e taşınır.
- Dashboard/Raporlar dahil tüm sayfalar store'dan okur; veri yoksa **empty state** kartı gösterilir ("Henüz kayıt yok — ekleyin veya içe aktarın").

## 2. İçe aktarma altyapısı
- `bun add xlsx pdfjs-dist`
- `src/lib/importers.ts`: `parseExcel`, `parsePdfTable`, `parseProductXml` (URL veya yapıştırılan XML).
- Ortak `ImportDialog`: dosya seç → önizleme tablosu → alan eşleme → içe aktar.

## 3. Sayfa değişiklikleri

### Satış / Alış Faturaları
- Satırda **Sil** (onaylı).
- Toolbar: **Excel İçe Aktar**, **PDF İçe Aktar** (her ikisinde).

### Cari Hesaplar
- **Yeni Cari** dialogu, satırda **Sil**.

### Tedarikçiler
- Rota (`tedarikciler.tsx`) ve sidebar öğesi silinir.

### Ürünler
- **XML İçe Aktar** dialogu (URL veya yapıştırılan XML) → etiket eşleme: ürün adı, stok kodu, barkod, kategori. Kategori/resim import'a dahil edilmez, sadece ad/stok kodu/barkod alınır; kategori bağlantısı XML'den kurulur.
- Manuel **Yeni Ürün**, satırda **Sil**.

### Kategoriler
- XML import edilen kategoriler otomatik eklenir.
- Kategori kartına tıkla → o kategorideki ürünleri listeleyen drawer.

### Stok Hareketleri
- Rota + sidebar öğesi silinir.

### Bankalar
- **Yeni Hesap** dialogu (ad, IBAN, para birimi, açılış bakiyesi, renk).
- Karta tıkla → `/bankalar/$id`:
  - Hareket tablosu (tarih, açıklama, giriş, çıkış, bakiye)
  - **Yeni Hareket** (manuel), satırda **Düzenle/Sil**
  - **Excel/PDF İçe Aktar** (ekstre)

### Kasa
- Kartta son hareketler + "Tümü" linki.
- **Giriş / Çıkış / Düzeltme** dialogları.
- `/kasa/$id`: tam hareket tablosu, düzenle/sil.

### Gelirler / Giderler
- `bankTx` + `cashTx`'ten `type = income|expense` olarak ayrıştırılır.
- Özet kartları (toplam gelir, gider, net) + kaynak/tarih/kategori filtresi + birleşik tablo.
- Sadece okuma — kayıtlar banka/kasa sayfalarından girilir (tek gerçek kaynak).

### Dashboard & Raporlar
- Tüm grafikler store'dan türetilir. Veri yoksa empty state.

## 4. Teknik notlar
- `pdfjs-dist` worker: `?url` import ile Vite'a bağlanır.
- XML parse tarayıcıda `DOMParser`. CORS olursa yapıştırma alternatifi.
- Zustand persist key: `fintra:v1`, şema değişirse `version` bump.
- Rota silindiğinde `routeTree.gen.ts` otomatik regenerate.

## 5. Kapsam dışı
- Backend / senkron
- Fatura PDF export (yalnız import)
- Kullanıcı yetkilendirme

Onaylarsan uygulamaya başlıyorum.
