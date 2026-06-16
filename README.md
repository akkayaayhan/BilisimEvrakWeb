# 📂 Bilişim Evrak Yönetim Sistemi

Bilişim Teknolojileri öğretmenleri için evrak (Yıllık Plan, Zümre, Yazılı, Şeflik Evrakı, Zanaat Atölyesi, Açık Lise, Uygulama Sınavı vb.) **yükleme, kategorilere göre saklama ve her yerden erişme** sistemi.

Node.js + Express ile yazılmıştır. Veritabanı olarak **derleme gerektirmeyen JSON dosyası** kullanır, bu yüzden Hostinger gibi paylaşımlı Node.js ortamlarında sorunsuz çalışır.

---

## ✨ Özellikler

- 🔐 **Kullanıcı adı + şifre** ile giriş (çok kullanıcılı, rol bazlı: Yönetici / Kullanıcı)
- 🗂️ **Yönetilebilir kategoriler** — panelden kategori ekle/sil
- ⬆️ **Evrak yükleme** (PDF, Word, Excel, PowerPoint, resim, zip vb.)
- ⬇️ İndirme ve tarayıcıda görüntüleme
- 🔍 Başlık, açıklama ve dosya adına göre **arama**
- 👤 **Kullanıcı yönetimi** (yönetici yeni kullanıcı açar, şifre sıfırlar)
- 📱 Mobil uyumlu, sade arayüz
- 💾 Yüklenen dosyalar ve kayıtlar **git dışında** tutulur → deploy'da **silinmez**

---

## 🚀 Hostinger'da Kurulum (GitHub üzerinden)

### 1. Repoyu Hostinger'a bağlayın
Hostinger hPanel → **Web Sitesi → Node.js** (veya GIT) bölümünden bu GitHub reposunu seçin / klonlayın.

### 2. Giriş (entry) dosyası
- **Application startup file:** `server.js`
- **Application root:** repo kök dizini

### 3. Ortam değişkenlerini (Environment Variables) ayarlayın
`.env.example` dosyasını örnek alın. Hostinger panelinde şu değişkenleri tanımlayın:

| Değişken | Açıklama |
|---|---|
| `SESSION_SECRET` | Uzun, rastgele bir metin (güvenlik anahtarı) |
| `ADMIN_USERNAME` | İlk yönetici kullanıcı adı (örn. `admin`) |
| `ADMIN_PASSWORD` | İlk yönetici şifresi |
| `MAX_UPLOAD_MB` | En büyük dosya boyutu (MB), örn. `50` |
| `PORT` | Genelde Hostinger otomatik atar, dokunmayın |

> `SESSION_SECRET` üretmek için:
> ```
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

### 4. Bağımlılıkları kurun ve başlatın
Hostinger paneli genelde otomatik yapar. Manuel ise:
```bash
npm install
npm start
```

### 5. İlk giriş
Site açılınca `.env`'de belirlediğiniz `ADMIN_USERNAME` / `ADMIN_PASSWORD` ile giriş yapın.
**İlk işiniz:** Sağ üst → *Hesabım* → şifrenizi değiştirin.

---

## 💻 Bilgisayarınızda (local) çalıştırma

```bash
# 1. Bağımlılıkları kur
npm install

# 2. .env dosyası oluştur (örnekten kopyala)
copy .env.example .env        # Windows
# cp .env.example .env        # Mac/Linux

# 3. Başlat
npm start
```
Tarayıcıdan: http://localhost:3000

---

## 📁 Proje Yapısı

```
BilisimEvrakWeb/
├── server.js            # Ana sunucu ve tüm rotalar
├── package.json
├── .env.example         # Örnek ortam değişkenleri
├── src/
│   ├── db.js            # JSON tabanlı veri katmanı
│   ├── auth.js          # Şifre hashleme + yetki middleware
│   └── upload.js        # Dosya yükleme (multer) ayarları
├── views/               # EJS arayüz şablonları
│   ├── partials/        # Ortak başlık/altlık
│   └── admin/           # Yönetim sayfaları
├── public/              # CSS ve JS
├── uploads/             # Yüklenen dosyalar (git dışı, kalıcı)
└── data/                # db.json (git dışı, kalıcı)
```

---

## 🔒 Önemli Notlar

- `uploads/` ve `data/` klasörleri `.gitignore`'dadır → GitHub'a gitmez, **deploy sırasında korunur**.
- `.env` dosyasını **asla** GitHub'a göndermeyin (zaten `.gitignore`'da).
- Yedek almak için `data/db.json` ve `uploads/` klasörünü düzenli kopyalayın.

---

Hazırlayan: **Ayhan Akkaya** · Bilişim Teknolojileri Öğretmeni
