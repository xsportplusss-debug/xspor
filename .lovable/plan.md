
# Banka Dosya Doğrulama Sistemi (PDF + XLSX + CSV + MT940)

Bankalar modülüne, yanlış bankaya ait ekstre yüklenmesini engelleyen çift doğrulama katmanı ekleyeceğim. Parser, kaydetme akışı ve UI korunacak; sadece yükleme öncesi doğrulama katmanı devreye girecek.

## 1. Yeni modül: `src/lib/bank-identity.ts`

Modüler banka kaydı:

```ts
type BankIdentity = {
  id: string;
  displayName: string;
  aliases: string[]; // normalize edilmiş formda karşılaştırılır
};
```

Başlangıçta tanımlı bankalar ve alias'ları:

- **VakıfBank** — vakifbank, vakif bank, t vakiflar bankasi, tvb
- **Halkbank** — halkbank, halk bankasi, turkiye halk bankasi, t halk bankasi
- **Ziraat Bankası** — ziraat, ziraat bankasi, t c ziraat bankasi, tc ziraat
- **Garanti BBVA** — garanti, garanti bbva, garanti bankasi, tgb
- **İş Bankası** — is bankasi, isbank, turkiye is bankasi, t is bankasi
- **Akbank** — akbank, akbank tas
- **Kuveyt Türk** — kuveyt turk, kuveytturk, kuveyt turk katilim
- **DenizBank** — denizbank, deniz bank
- **ING** — ing, ing bank, ing bank as
- **QNB** — qnb, qnb finansbank, finansbank
- **TEB** — teb, turk ekonomi bankasi, t ekonomi bankasi

Yardımcılar:
- `normalize(text)` — küçük harf, Türkçe karakter sadeleştirme (ı→i, ş→s, ç→c, ğ→g, ü→u, ö→o), noktalama/alt çizgi/tire/. karakterlerini boşluğa, çoklu boşluğu tek boşluğa indir.
- `matchesBank(text, bank)` — normalize edilmiş metinde bankanın alias'larından biri kelime sınırıyla geçiyor mu.
- `detectBanks(text)` — metinde tespit edilen tüm bankaları döner (yanlış eşleşmeyi kullanıcıya ipucu olarak göstermek için).

## 2. Doğrulama akışı — tüm formatlar için

`src/routes/bankalar.tsx` içindeki `UploadStatementDialog`'ta, kullanıcı dosya seçip "Analiz Et" dediğinde iki aşama çalışır:

**A. Dosya adı kontrolü (tüm formatlar: PDF/XLSX/CSV/MT940)**
`matchesBank(fileName, selectedBank)` başarısızsa:
> "Seçtiğiniz dosya adı {BankaAdı}'a ait görünmüyor. Lütfen doğru bankaya ait ekstreyi seçiniz."
(Metinde farklı banka tespit edilirse: "(Tespit edilen: Halkbank)" ipucu eklenir.)

**B. İçerik kontrolü (dosya türüne göre)**
- **PDF**: mevcut `parsePDF` altyapısıyla ilk 2 sayfanın metni çıkarılır (`extractPdfHeadText`).
- **XLSX**: ilk sayfanın ilk ~30 satırı `sheet_to_json({header:1})` ile okunup birleştirilir. Ekstre başlıkları (banka adı/logo alanı) genelde en üstte olur.
- **CSV**: dosyanın ilk ~4 KB'ı text olarak okunur.
- **MT940 / .sta / .txt**: dosyanın ilk ~4 KB'ı okunur; MT940 blok içeriğinde banka adı veya BIC (`TVBATR2A` VakıfBank, `TRHBTR2A` Halkbank, vb.) aranır. BIC eşlemesi alias listesine eklenir.

Birleştirilen metinde `matchesBank(content, selectedBank)` başarısızsa:
> "Dosya içeriği seçilen bankaya ait değildir."

Her iki kontrol geçerse mevcut parse + önizleme + "Onayla ve Kaydet" akışı aynen çalışır. Aksi halde hiçbir kayıt oluşturulmaz.

## 3. Bilinmeyen banka davranışı

Kullanıcının eklediği banka adı hiçbir `BankIdentity` ile eşleşmiyorsa (özel/bilinmeyen banka): doğrulama atlanır, mevcut davranış korunur. Katı doğrulama yalnızca bilinen bankalar için uygulanır — bu, yeni banka eklemeyi engellemez.

## 4. Hata yönetimi

- Şifreli/bozuk/okunamayan PDF veya XLSX: try/catch ile yakalanır, "Dosya okunamadı: bozuk, şifreli veya desteklenmeyen format olabilir." toast'u; dialog açık kalır, kayıt yapılmaz.
- İçerik boş (ör. taranmış PDF): "Dosya içeriği okunamadı, tarayıcı çıktısı olabilir. Doğrulama yapılamadığından yükleme iptal edildi."

## 5. Dokunulmayacaklar

- Mevcut parser mantığı (`src/lib/statement-parsers.ts`) — sadece küçük bir `extractHeadText` yardımcısı eklenecek.
- Kaydetme akışı, UUID/foreign key düzeltmeleri, işlem hareketleri ekranı, kategorizasyon.
- Diğer modüller.

Onaylarsanız uygulamaya geçerim.
