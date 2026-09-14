# Bankalar Modülü — Sıfırdan Yeniden Yapım

Mevcut Bankalar ekranı ve altındaki tüm eski kod kaldırılacak, yerine her bankanın kendi bağımsız sayfasıyla çalıştığı yeni bir yapı gelecek. Kayıtlı hareketleriniz korunur ve yeni ekranlara taşınır.

## Banka Listesi

22 banka hazır listede gelir: VakıfBank, Halkbank, Ziraat, İş Bankası, Garanti BBVA, Yapı Kredi, Akbank, QNB, DenizBank, ING, Kuveyt Türk, Albaraka Türk, Türkiye Finans, Vakıf Katılım, Ziraat Katılım, Emlak Katılım, Fibabanka, TEB, Şekerbank, Burgan Bank, ICBC Turkey, Anadolubank.

- Ana sayfa: her banka bir kart — bakiye, hareket sayısı, son ekstre tarihi.
- Ekstre yüklenmemiş bankalar soluk görünür; ilk yükleme ile otomatik aktifleşir.
- Arama kutusu ile banka bulma; "Aktif olanlar" / "Tümü" görünümü.

## Banka Sayfası

Her bankanın kendi sayfası olur ve yalnızca o bankanın verisini gösterir:

- Özet: toplam giriş, toplam çıkış, son bakiye, hareket sayısı.
- Hareketler tablosu: Tarih, Saat, Açıklama, İşlem Türü, Borç, Alacak, Bakiye, Para Birimi, Referans No.
- Okunabilirlik: uzun açıklamalar kırpılmaz, satır yükseklikleri rahat, sütun genişlikleri sürüklenerek ayarlanabilir, her sütundan sıralama.
- Filtreler: tarih aralığı, açıklama, işlem türü, tutar aralığı, sadece borç / sadece alacak.
- Canlı arama: yazdıkça anında süzülür.
- Varsayılan sıralama en yeni → en eski; tek tıkla ters çevrilir.
- Ekstre geçmişi sekmesi: yalnızca o bankaya yüklenmiş dosyalar (ad, tarih, dönem, hareket sayısı, tutarlar); dosyayı indirme ve o ekstreye ait hareketleri topluca silme.
- Dışa aktarma: görünen hareketleri Excel/CSV olarak indirme.

## Yükleme ve Doğrulama

Yükleme yalnızca bulunduğunuz bankanın sayfasından yapılır. PDF'in yanında Excel ve CSV de kabul edilir.

İki aşamalı doğrulama:

1. Dosya adı: banka adı dosya adında geçmeli. Büyük/küçük harf ve Türkçe karakter farkı gözetilmez (Vakıf = Vakif). "Ekstre", "Hesap Hareketleri", tarih, ay, yıl, alt çizgi, tire ve boşluk serbesttir. Ad eşleşmezse uyarı verilir; dosya adı anlamsızsa içerik doğrulaması belirleyici olur.
2. İçerik: dosya okunur, içinde ilgili bankanın adı/IBAN ön eki aranır. Başka bankaya aitse içe aktarma iptal edilir ve hangi bankaya ait göründüğü söylenir.

Her iki kontrol geçmeden tek satır bile kaydedilmez.

## Mükerrer Ekstre

Dosyanın parmak izi (SHA-256) alınır. Aynı dosya ikinci kez yüklenirse "Bu ekstre daha önce sisteme aktarılmış." uyarısı çıkar; isterseniz "Yine de aktar" ile devam edebilirsiniz. Satır bazında da mükerrer koruma vardır, aynı hareket iki kez yazılmaz.

## Kalıcılık ve Performans

- Hareketler ve yüklenen dosyalar sunucuda saklanır; program kapansa da kalır, her açılışta aynı şekilde gelir.
- Yüklenen PDF/Excel dosyaları güvenli depoda tutulur, geçmişten indirilebilir.
- Tablo sanallaştırılmış (yalnızca görünen satırlar çizilir) ve veri sayfa sayfa çekilir; 100.000 harekette bile akıcı çalışır.

## Hata Yönetimi

Bozuk, şifreli veya okunamayan dosyalar uygulamayı çökertmez. Anlaşılır Türkçe mesaj gösterilir ("PDF şifre korumalı", "Ekstre içinde hareket tablosu bulunamadı" gibi), işlem güvenle sonlanır ve hata kaydı tutulur. Yükleme özetinde okunan / kaydedilen / atlanan satır sayısı ve varsa hatalı satırlar listelenir.

---

## Teknik Detaylar

Silinecek: `src/routes/bankalar.tsx`, `src/routes/bankalar_.$id.tsx`, `src/lib/banks/**`, `src/lib/bank-parsers/**`, `src/lib/bank-service.ts`, `src/lib/statement-parsers.ts`, `src/components/bank/**`.

Yeni yapı (`src/features/bank/`):

- `core/types.ts` — `StdTx`, `ParseResult`, `BankDef`, hata tipleri.
- `core/text.ts` — tarih/sayı/IBAN/para ayrıştırma, Türkçe normalizasyon (`ı→i`, aksan/boşluk temizliği).
- `core/pdf-engine.ts` — pdfjs-dist ile koordinat tabanlı satır çıkarımı; şifreli/bozuk dosya için tiplenmiş hata.
- `core/sheet-engine.ts` — xlsx ile Excel/CSV satır çıkarımı.
- `core/validate.ts` — `matchesFileName(def, name)` + `matchesContent(def, text)`; iki aşamalı doğrulama ve "hangi bankaya ait" tahmini.
- `banks/registry.ts` — 22 bankanın tanımı (kod, etiket, renk, alias regex, IBAN ön eki, parser, sütun düzeni). Yeni banka = yeni parser dosyası + tek kayıt.
- `banks/parsers/*.ts` — banka başına parser; ortak `genericStatementParser` tabanı, özel düzeni olan bankalar (Halkbank, VakıfBank, Ziraat, İş, Garanti, YKB, Akbank, DenizBank) kendi uygulamalarını verir, kalanlar generic + alias ile başlar.
- `data/*.ts` — Supabase katmanı: `listBanks`, `bankSummary`, `listTransactions` (keyset pagination + filtre + sıralama sunucu tarafında), `listStatements`, `importStatement`, `deleteStatement`, `exportTransactions`.
- `ui/` — `BankGrid`, `BankPage`, `TxTable` (@tanstack/react-virtual + yeniden boyutlanabilir sütunlar), `TxFilters`, `StatementHistory`, `UploadDialog` (ilerleme, doğrulama, mükerrer onayı, sonuç raporu).
- Rotalar: `src/routes/bankalar.index.tsx` ve `src/routes/bankalar.$code.tsx` (kod bazlı, örn. `/bankalar/vakifbank`), her ikisinde `head()`, `errorComponent`, `notFoundComponent`.

Veri tabanı (mevcut tablolar korunur, additive migration):

- `banks.bank_code` üzerinden kod eşlemesi; eksik kodlar mevcut isimlerden backfill edilir (veri korunur).
- `bank_statements`: `file_hash` üzerine `UNIQUE (user_id, bank_id, file_hash)` — mükerrer dosya tespiti.
- `bank_transactions`: mevcut `UNIQUE (user_id, bank_id, dedup_key)` korunur; `(user_id, bank_id, date DESC, pdf_order)` indeksi eklenir.
- Hata kaydı: mevcut `audit_logs` tablosuna `entity='bank_import'` kayıtları (hata mesajı + dosya + banka).
- Dosya saklama: mevcut `bank-statements` (private) bucket; yol `{user_id}/{bank_code}/{hash}.pdf`, indirme signed URL ile. `storage.objects` için sahiplik RLS politikaları doğrulanır/eklenir.

İçe aktarma akışı tek bir `importStatement` işleminde: doğrula → ayrıştır → dosyayı yükle → `bank_statements` satırı → hareketleri 500'lük partiler halinde `upsert(onConflict: dedup_key)` → banka bakiyesi/son ekstre tarihi güncelle → rapor döndür. Herhangi bir adımda hata olursa yüklenen dosya ve statement satırı geri alınır.

Sidebar ve ana sayfadaki banka dağılım tablosu yeni veri katmanına bağlanır; diğer modüller (kasa, faturalar, gelir-gider) değiştirilmez.
