# Bankalar Modülü — Uygulama Planı

Mevcut çalışan özellikler korunacak. Sadece Bankalar akışı ve ilişkili muhasebe entegrasyonu genişletilecek. Erişim yalnızca **xsportplusss@gmail.com** hesabıyla sınırlı kalacak (mevcut AuthGate zaten bu kısıtı uyguluyor — server tarafında da doğrulama eklenecek).

## 1. Veritabanı (Lovable Cloud)

Yeni/yenilenen tablolar (hepsi RLS + `user_id = auth.uid()` politikası ile):

- `banks` — banka_adi, iban, hesap_no, para_birimi, aktif, guncel_bakiye, son_ekstre_tarihi
- `bank_accounts` — çoklu hesap desteği (bank_id, hesap_adi, iban, hesap_no, bakiye)
- `bank_statements` (mevcut, genişletilecek) — bank_account_id, donem_baslangic, donem_bitis, dosya_hash (duplicate önleme), islem_sayisi, durum
- `statement_files` — orijinal dosya referansı (storage path, mime, size, uploaded_by)
- `statement_transactions` — statement_id, tarih, aciklama, tutar, borc, alacak, bakiye, referans_no, kategori, matched_invoice_id, matched_customer_id
- `accounting_entries` — transaction_id, tip (gelir/gider/tahsilat/ödeme/komisyon/vergi), kategori, tutar, tarih
- `customers` (yoksa) — ad, vkn/tckn, bakiye
- `invoices` (yoksa) — fatura_no, musteri_id, tutar, durum, tarih

Storage: mevcut `bank-statements` bucket'ı kullanılacak; RLS `{user_id}/` klasör kuralı.

## 2. Bankalar Sayfası (`/bankalar`)

Banka kartları grid:
- Banka Adı · IBAN · Hesap No · Güncel Bakiye · Son Ekstre Tarihi
- Aksiyonlar: **Ekstre Yükle · Ekstre Geçmişi · İndir · Sil · Yenile**
- Üstte "Yeni Banka Ekle" ve genel özet (toplam bakiye).

## 3. Ekstre Yükleme

Kabul edilen formatlar: **PDF, XLSX, CSV, MT940**.

Sunucu tarafı server function (`createServerFn` + `requireSupabaseAuth`):
1. Dosyayı Storage'a yükle (`{user_id}/{bank_id}/{timestamp}-{filename}`).
2. SHA-256 hash hesapla → duplicate kontrolü.
3. Format tespiti → parser çalıştır:
   - CSV/XLSX: başlık eşleme (Tarih, Açıklama, Borç, Alacak, Bakiye, Ref).
   - PDF: `pdfjs-dist` ile text extract + regex satır ayrıştırma.
   - MT940: `:61:` ve `:86:` bloklarını parse eden yerel parser.
4. `bank_statements` + `statement_files` + `statement_transactions` kayıtları oluştur.
5. Her transaction için otomatik kategorizasyon (anahtar kelime tabanlı):
   - Trendyol/Hepsiburada/Amazon/N11/Pazarama → Satış Geliri
   - Kargo → Kargo Gideri · Komisyon → Banka Komisyonu · POS → POS Kesintisi
   - Vergi/SGK/Maaş/Kira/Elektrik → ilgili gider kategorisi
6. `accounting_entries` üret, banka bakiyesini güncelle.
7. Fatura eşleştirme: tutar + tarih + referans → varsa `invoices.durum = 'Ödendi'`.
8. Cari eşleşmesi: açıklama içinde müşteri adı → `customers.bakiye` güncelle.

Yükleme sonu özet modal: **Toplam İşlem · Gelir · Gider · Tahsilat · Ödeme · Komisyon · Bekleyen Eşleştirme · Hatalı Kayıt**.

## 4. Ekstre Geçmişi Sayfası (`/bankalar/ekstre-gecmisi`)

Tablo sütunları: Dosya Adı · Banka · Dönem · Yükleme Tarihi · İşlem Sayısı · Durum · Görüntüle · İndir · Sil

- **Görüntüle**: transaction listesi drawer/dialog (kategori, eşleşme durumu, manuel düzeltme).
- **Sil**: sadece dosyayı ve statement kaydını siler; `accounting_entries` ve `statement_transactions` korunur (onay diyaloğu).

## 5. Diğer Modüllere Entegrasyon

Import sonrası otomatik güncellenir:
- **Cari Hesaplar** — müşteri bakiyeleri
- **Gelir / Gider** — muhasebe kayıtları
- **Kasa** — nakit hareketleri (varsa)
- **Banka Bakiyesi** — son bakiye
- **Finans Özeti / Nakit Akışı** — dashboard kartları

## 6. Yetkilendirme

- Client: mevcut `AuthGate` `xsportplusss@gmail.com` dışındaki kullanıcıları engelliyor — korunacak.
- Server: her `createServerFn` `requireSupabaseAuth` middleware'i + email whitelist kontrolü (403 aksi halde).
- RLS: tüm tablolarda `user_id = auth.uid()`.

## 7. Teknik Notlar

- React Query ile cache; mutations → `invalidateQueries`.
- Parser modülleri `src/lib/statement-parsers/` altında (csv.ts, xlsx.ts, pdf.ts, mt940.ts).
- Kategorizasyon kuralları `src/lib/tx-classifier.ts`.
- UI mevcut tema tokenlarını kullanır (glass, shadow-elegant); mobil-first responsive grid.

## Uygulama Sırası

1. DB migration (yeni tablolar + RLS + GRANT).
2. Server functions (upload, list, parse, delete, classify, match).
3. Parser + classifier modülleri.
4. Bankalar sayfası UI yenileme (kartlar + aksiyonlar).
5. Ekstre Geçmişi sayfası.
6. Import özet modal + toast.
7. Cari / Gelir-Gider / Dashboard entegrasyonları.
8. E2E test: bir CSV yükle, kategorileri ve bakiyeyi doğrula.

Onaylarsanız migration'dan başlayacağım.