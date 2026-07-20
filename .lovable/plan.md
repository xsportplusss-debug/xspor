
# Bankalar Modülü — Yeniden Tasarım

Bankalar iki alt-sayfaya bölünür. Diğer modüller değişmez; store/tipler/parser'lar korunur.

## Sidebar
`Bankalar` alt-menülü olur:
- **Banka Ekle** → `/bankalar/hesaplar`
- **Banka Ekstreleri** → `/bankalar/ekstreler`

`/bankalar` → `/bankalar/hesaplar` yönlendirmesi.

## 1) Banka Ekle — `/bankalar/hesaplar`
Sadece hesap tanımlama.

- Tablo: Banka Adı, Şube, IBAN, Hesap No, Döviz, Hesap Türü, Açılış Bakiyesi, Durum, İşlem.
- Butonlar: **Yeni Banka**, satır bazında **Düzenle** / **Sil** (hareketi olan silinemez), Aktif/Pasif switch, form içinde **Kaydet**.
- Form alanları: Banka Adı, Şube, IBAN, Hesap No, **Hesap Türü** (Vadesiz/Vadeli/Kredi/POS), Döviz (TRY/USD/EUR/GBP/CHF), Başlangıç Bakiyesi, Açıklama, Aktif/Pasif.
- Mevcut renkli özet kartları korunur; tablo/kart geçiş toggle'ı.

## 2) Banka Ekstreleri — `/bankalar/ekstreler`
Tüm bankaların hareketleri tek ekranda.

### Üst — Özet Kartları
Toplam Borç, Toplam Alacak, Toplam İşlem, Son Bakiye (filtreye göre canlı).

### Yükleme Barı
- **Banka seçici** (Select) — önce banka.
- İki buton: **PDF Yükle**, **Excel Yükle** (.xlsx/.xls/.csv). Sürükle-bırak yok; `<input type="file">` + `click()`.
- Yükleme sonrası önizleme dialog'u: parser adı, satır sayısı, mükerrer sayısı; **Aktar** / **İptal**.
- Mükerrer kontrolü: `bankId+date+description+amount+refNo`. Ayrıca `fileName+bankId+rowCount` → aynı ekstre uyarısı, yine de içe aktarma seçeneği.

### Otomatik Ayrıştırma
- **PDF**: mevcut `BANK_PARSERS` (Halkbank, VakıfBank, generic) genişletilir — çıktıya `debit/credit/balance/currency/refNo`.
- **Excel/CSV**: `src/lib/importers.ts` içine `parseBankExcel()` — başlık satırını otomatik bulur, TR/EN eşleme: Tarih, Açıklama, Dekont Açıklaması, Referans, Borç, Alacak, Tutar, Bakiye, Döviz.
- `BankTx` tipine opsiyonel alanlar: `debit`, `credit`, `balance`, `currency`, `status ("Yeni"|"Muhasebeleştirildi"|"Eşleşti")`. Geriye dönük: `amount = credit - debit`.

### Hareketler Tablosu
Sütunlar: Tarih, Açıklama, Ref No, Borç, Alacak, Bakiye, Döviz, Kaynak (PDF/Excel/CSV/Manuel), Durum.

- Sayfalama 25/50/100 + sütun sıralama.
- Satır aksiyonu: durum değiştir, düzenle, sil.
- **Excel'e Dışa Aktar** butonu.

### Filtreler + Arama
Tarih aralığı, Banka (multi), Döviz, Sadece Borç / Sadece Alacak, Durum, canlı arama (açıklama+refNo).

### Dosya Geçmişi
Collapsible panel. Sütunlar: Dosya Adı, Banka, Tarih, İşlem Sayısı, Durum. Aksiyonlar: **Aç** (o dosyanın hareketlerine filtre), **Yeniden İşle** (cascade delete + yeniden yükleme istemi), **Sil** (cascade — `importId` eşleşen hareketleri kaldırır).

## Teknik Notlar
**Değişen/yeni dosyalar:**
- `src/lib/mock-data.ts` — `BankTx` ve `Bank`'e opsiyonel alanlar.
- `src/lib/bank-parsers.ts` — çıktı zenginleştirilir.
- `src/lib/importers.ts` — `parseBankExcel()`.
- `src/routes/bankalar.tsx` — `/bankalar/hesaplar`'a redirect.
- `src/routes/bankalar.hesaplar.tsx` — hesap yönetimi (mevcut UI uyarlanır).
- `src/routes/bankalar.ekstreler.tsx` — yeni ekstre/hareket sayfası.
- `src/components/app-sidebar.tsx` — Bankalar alt-menüsü.
- `src/routes/bankalar.$id.tsx` — korunur; Hesaplar'dan linklenir.

**Store:** Mevcut `banks/bankTx/bankImports` + eylemler yeterli — migration yok.
