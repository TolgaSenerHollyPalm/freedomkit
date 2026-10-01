# Yeni kit açma

Bu depo KitShelf kitlerinin şablonu: çevrimdışı çalışan, hesapsız, verisi cihazda kalan bir PWA'nın iskeleti. Tema,
bileşenler ve yedekleme [kitshelf-ui](https://github.com/TolgaSenerHollyPalm/kitshelf-ui)'den gelir. İçinde örnek
olarak küçük bir "Notlar" uygulaması var; Ayarlar ekranı, yedekleme ve yayın hattı hazır.

Yeni kit aşağıdaki sırayla açılır. Örnekler BookKit için yazıldı.

## 1. Depoyu aç

1. GitHub'da **boş** bir depo aç: ad kitin adı, herkese açık, README / .gitignore / lisans eklemeden. Ücretsiz planda
   GitHub Pages yalnızca herkese açık depolarda çalışır.
2. Şablonu yerelde kopyala, commit kimliğini ayarla ve ilk commit'i kendin at:

   ```bash
   git clone https://github.com/TolgaSenerHollyPalm/kit-template.git bookkit
   cd bookkit && rm -rf .git && git init -b main
   git config user.name "Ad Soyad" && git config user.email "<id>+<kullanıcı>@users.noreply.github.com"
   git add . && git commit -m "Start from kit-template"
   git remote add origin https://github.com/TolgaSenerHollyPalm/bookkit.git && git push -u origin main
   ```

3. `package.json`'daki `name` alanına deponun adını yaz, sonra `npm install` (kilit dosyasındaki ad da güncellenir).

**Use this template** düğmesi aynı dosyaları verir ama ilk commit'i GitHub atar: yazar, hesabın birincil e-postası
olur ve herkese açık geçmişe girer. Hesapta "Keep my email addresses private" açık değilse bu yolu kullanma. O ayar
depoya göre değil hesaba göredir: açılınca hesabın bütün depolarında, sitede yapılan commit'ler noreply adresiyle atılır.

İlk push'ta `deploy.yml` kendiliğinden çalışır; kurulum, test ve derleme geçer, Pages henüz açık olmadığı için
"Setup Pages" adımında **hata verir**. Beklenen bir durum; 7. adımda düzelir. Yayına kadar hiç çalışmasın istersen `deploy.yml`'deki `push:` tetikleyicisini sil,
`workflow_dispatch` kalsın; yayın günü geri eklersin.

## 2. Kimlik: `.env`

```
VITE_KIT_ID=bookkit
VITE_KIT_NAME=BookKit
VITE_KIT_DESCRIPTION="Okuduğun kitaplar, notların ve alıntıların. Çevrimdışı, hesapsız."
DEV_PORT=5175
PREVIEW_PORT=4175
```

| Değer | Kural | Nereye gider |
| --- | --- | --- |
| `VITE_KIT_ID` | Küçük harf ve rakam | IndexedDB adı, bütün localStorage anahtarlarının ön eki (`bookkit-appearance`), yedek dosyasının adı (`bookkit-yedek-2026-10-01.json`) ve yedeğin içindeki `kit` alanı |
| `VITE_KIT_NAME` | "Kit" ile biten tek kelime | Sekme başlığı, ana ekran, manifest, mesajlar ("BookKit'e yalnızca BookKit yedekleri yüklenebilir") |
| `VITE_KIT_DESCRIPTION` | `"`, `<`, `>`, `%` içermez | Sayfa açıklaması ve manifest |
| `DEV_PORT`, `PREVIEW_PORT` | Her kitte farklı | `npm run dev` ve `npm run preview` |

- Ad ve kimlik başka hiçbir dosyaya yazılmaz; `index.html`, manifest ve `src/kit.ts` buradan okur. Eksik ya da hatalı
  bir değerde derleme durur ve nedenini söyler.
- **Kimliği yayından sonra değiştirme.** Kullanıcıların verisi ve ayarları eski adın altında kalır, eski yedekler
  "başka bir kitin yedeği" sayılır.
- Portlar: aynı portta daha önce başka bir kit çalıştıysa tarayıcıda onun service worker'ı kalır ve yeni kitin yerine o
  açılır. Ayrılanlar: TripKit 5173 / 4173, kit-template 5174 / 4174, BookKit 5175 / 4175. Yeni kit sıradaki çifti
  alır.

## 3. Renk: `src/kit.css`

Dört token, açık ve koyu tema için ayrı ayrı yazılır. Zemin, yazı ve diğer tonlar `kitshelf-ui`'den gelir;
onlara dokunma.

| Token | Nerede görünür |
| --- | --- |
| `--color-primary` | Ana düğme, işaretli kutu, ilerleme çubuğu |
| `--color-primary-dark` | Kit rengindeki yazı ve ikonlar: ikinci düğme, bağlantı, seçili seçenek |
| `--color-primary-soft` | Seçili seçeneğin ve ikon kutularının zemini |
| `--color-on-primary` | `--color-primary` üstündeki yazı |

**Kontrast denetimi:** `npm test`, `kitshelf-ui`'nin kit rengiyle yazı yazdığı beş yeri iki temada da ölçer ve 4.5:1'in
altında kalanı oranıyla birlikte bildirir:

- `--color-on-primary` / `--color-primary`
- `--color-primary-dark` / kart zemini, sayfa zemini, `--color-primary-soft` ve yedek hatırlatmasının amber zemini

Amber gibi açık bir renkte `--color-on-primary` koyu olmalı. Renkler altı haneli onaltılık (`#9b3d63`) yazılır.

## 4. İkonlar

1. `public/favicon.svg` dosyasını kitin ikonuyla değiştir: 512 × 512, köşe yarıçapı 112 olan kare zemin. Ana ekranda
   adın yanındaki işaret de bu dosyadır.
2. `npm run icons` PNG'leri üretir (yalnızca macOS; `sips` kullanır).
   - Maskelenebilir ikon için ayrı bir çizim varsa: `npm run icons -- yol/maskable.svg`. Çizim tam zeminli olmalı,
     içerik ortadaki %80'de kalmalı.
   - Yoksa betik favicon'un köşelerini düzleştirerek üretir; bu durumda favicon'daki çizim ortadaki %80'in içinde
     olmalı, çünkü Android kenarları kırpar.
3. `npm test` her ikonun yerinde ve doğru boyutta olduğunu denetler.

## 5. Örnek veriyi kendi verinle değiştir

"Notlar" örneği yalnızca yedek alıp geri yüklemenin uçtan uca çalıştığını gösterir. Değişecek yerler:

| Dosya | İçinde ne var |
| --- | --- |
| `src/notes/` | Kayıt tipi ve saf fonksiyonlar. Kendi klasörünü aç, bunu sil. |
| `src/storage/db.ts` | Depolar, `DATABASE_VERSION`, okuma ve yazma, tek işlemde (`transaction`) geri yükleme |
| `src/backup/restorePlan.ts` | `KitData`: yedeğin taşıdığı veri; birleştirme ve değiştirme planı |
| `src/backup/kitBackup.ts` | Yedek metinleri, dosya doğrulama, özet sayıları, `migrateKit` |
| `src/app/appData.ts`, `src/app/AppDataProvider.tsx` | Bellekteki veri ve onu değiştiren fonksiyonlar |
| `src/app/router.ts` | Adresler |
| `src/screens/HomeScreen.tsx`, `src/screens/NoteScreen.tsx` | Örnek ekranlar |
| `src/screens/SettingsScreen.tsx` | Kalır; "Bu cihazda" sayıları ve silme metinleri değişir |
| `src/ui/icons.tsx` | Kitin kendi ikonları (ortak ikonlar `kitshelf-ui`'de) |

Kurallar:

- Her kayıtta `id` ve `updatedAt` bulunur. `updatedAt`, kayıt her kaydedildiğinde `AppDataProvider` içinde damgalanır;
  yedekten geri yüklerken damgalanmaz. Birleştirme iki kopyadan yenisini buna göre tutar.
- Yeni bir localStorage anahtarı gerekirse `src/kit.ts`'teki `KEYS`'e ekle. Ön eki oradan gelir ve "Tüm verileri sil"
  onu da siler.
- Veri biçimi değişince `DATABASE_VERSION` artar. Aynı adım hem `db.ts`'teki `upgrade()`'e hem `migrateKit`'e yazılır;
  yoksa eski yedekler açılmaz.
- `kitshelf-ui` sürümü `package.json`'da etiketle sabittir. Yükseltmek için etiketi değiştir, `npm install` çalıştır.
- Arayüz metinleri Türkçe; kod yorumları, commit mesajları ve README İngilizce.

## 6. Denetle

```bash
npm test && npm run lint && npm run build
npm run preview
```

- Service worker yalnızca derlenmiş sürümde çalışır; çevrimdışı açılışı `npm run preview` ile dene.
- 390 ve 360 px genişlikte, açık ve koyu temada bak: yatay kaydırma yok, dokunma alanları en az 44 px.
- Yedek al, dosyayı başka bir tarayıcıda geri yükle.
- Telefonda denemek için HTTPS gerekir. Yerel ağdaki `http://192.168…` adresinde service worker, ana ekrana ekleme
  ve paylaşım menüsü çalışmaz.

## 7. Yayın

Sıra önemli: `base` `/` olduğu için alan adı bağlanmadan site `…github.io/<depo>/` adresinde bozuk görünür.

1. GitHub › depo › **Settings › Pages › Build and deployment › Source: GitHub Actions**.
2. Cloudflare › `kitshelf.app` › DNS: `CNAME`, ad `book`, hedef `tolgasenerhollypalm.github.io`, Proxy status
   **DNS only**. Proxy açık kalırsa GitHub sertifika alamaz.
3. GitHub › depo › **Settings › Pages › Custom domain**: `book.kitshelf.app` › Save. Denetim geçince
   **Enforce HTTPS**'i işaretle; sertifikanın gelmesi birkaç dakika sürebilir. `CNAME` dosyası gerekmez.
4. `main`'e push yayındır: `deploy.yml` testleri çalıştırır, derler ve Pages'e gönderir. 1. adımda `push:`
   tetikleyicisini sildiysen geri ekle.
5. README'yi kitine göre yeniden yaz; bu dosyayı silebilirsin.

Yayından sonra:

- GitHub Pages dosyaları 10 dakikaya kadar önbellekten verir; yeni sürüm hemen görünmeyebilir.
- Ziyaret sayacı isteğe bağlı: TripKit'in `index.html` dosyasındaki Cloudflare Web Analytics satırı `</body>`'den
  önce eklenir.
- `kitshelf.app` ana sayfasındaki kartı güncelle (`kitshelf-site` deposu).
