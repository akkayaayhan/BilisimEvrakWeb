'use strict';

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);

const db = require('./src/db');
const { hashPassword, verifyPassword, requireAuth, requireAdmin } = require('./src/auth');
const { upload, UPLOAD_DIR } = require('./src/upload');
const { generatePlanBuffer } = require('./src/plangen');
const { CALENDARS, adaptRows } = require('./src/calendar');
const { generateZumreBuffer } = require('./src/zumregen');

// -------------------- Baslangic --------------------
db.load();
db.seed(hashPassword);

const app = express();
const PORT = process.env.PORT || 3000;

// Hostinger gibi ters proxy arkasinda dogru calismasi icin
app.set('trust proxy', 1);

// Gorunum (template) motoru
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Statik dosyalar (css, js, gorseller)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Form verilerini okuyabilmek icin
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Oturum (session) - dosya tabanli depolama ile (sunucu yeniden baslayinca kaybolmaz)
const SESSIONS_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

app.use(
  session({
    store: new FileStore({
      path: SESSIONS_DIR,
      retries: 1,
      ttl: 60 * 60 * 24 * 7, // 7 gun
      logFn: () => {}
    }),
    secret: process.env.SESSION_SECRET || 'lutfen-env-icinde-degistirin',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 gun
      sameSite: 'lax'
    }
  })
);

// -------------------- Yardimcilar (tum gorunumlerde kullanilabilir) --------------------
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function previewKind(originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'image';
  if (ext === '.docx') return 'word'; // tarayici icinde cizilebilir (.doc eski formati desteklenmez)
  if (['.txt'].includes(ext)) return 'text';
  return 'other';
}

function fileIcon(originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  if (['.pdf'].includes(ext)) return '📕';
  if (['.doc', '.docx', '.odt', '.rtf'].includes(ext)) return '📘';
  if (['.xls', '.xlsx', '.ods'].includes(ext)) return '📗';
  if (['.ppt', '.pptx', '.odp'].includes(ext)) return '📙';
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return '🖼️';
  if (['.zip', '.rar', '.7z'].includes(ext)) return '🗜️';
  if (['.txt'].includes(ext)) return '📄';
  return '📎';
}

// Her istekte gorunumlere ortak veriler aktar
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.helpers = { formatBytes, formatDate, fileIcon, previewKind };
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.query = '';
  // Yan menude (sidebar) gosterilecek kategoriler - her sayfada lazim
  res.locals.navCategories = db.categories.all();
  res.locals.currentPath = req.path;
  // Yoneticiye onay bekleyen uye sayisini menude goster
  res.locals.pendingCount =
    req.session.user && req.session.user.role === 'admin' ? db.users.countPending() : 0;
  next();
});

function setFlash(req, type, message) {
  req.session.flash = { type, message };
}

// Donemi coz: yeni ad girildiyse olustur (ya da ayni adliyi bul), yoksa secileni kullan
function resolveTerm(termId, newTerm) {
  if (newTerm && newTerm.trim()) {
    let term = db.terms.findByName(newTerm);
    if (!term) term = db.terms.create({ name: newTerm });
    return term.id;
  }
  if (termId && db.terms.findById(termId)) return termId;
  return null;
}

// ==================== ROTALAR ====================

// ---------- Giris / Cikis ----------
app.get('/giris', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('login', { title: 'Giris Yap', error: null });
});

app.post('/giris', (req, res) => {
  const { username, password } = req.body;
  const user = db.users.findByUsername(username || '');
  if (!user || !verifyPassword(password || '', user.passwordHash)) {
    return res.status(401).render('login', {
      title: 'Giris Yap',
      error: 'Kullanici adi veya sifre hatali.'
    });
  }
  if (user.status === 'pending') {
    return res.status(403).render('login', {
      title: 'Giris Yap',
      error: 'Hesabiniz henuz yonetici tarafindan onaylanmadi. Onaylandiktan sonra giris yapabilirsiniz.'
    });
  }
  req.session.userId = user.id;
  req.session.user = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role
  };
  const dest = req.session.returnTo || '/';
  delete req.session.returnTo;
  // Oturumu diske YAZDIKTAN sonra yonlendir (yarisma durumunu onler).
  // Aksi halde tarayici, oturum dosyasi yazilmadan / sayfasini ister
  // ve tekrar giris ekranina atilir.
  req.session.save((err) => {
    if (err) {
      console.error('[oturum] kaydedilemedi:', err);
      return res.status(500).render('login', {
        title: 'Giris Yap',
        error: 'Oturum baslatilamadi, lutfen tekrar deneyin.'
      });
    }
    res.redirect(dest);
  });
});

app.post('/cikis', (req, res) => {
  req.session.destroy(() => res.redirect('/giris'));
});

// ---------- Uye Ol (kayit) ----------
app.get('/uye-ol', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('register', { title: 'Uye Ol', error: null, form: {} });
});

app.post('/uye-ol', (req, res) => {
  const { fullName, username, password, password2 } = req.body;
  const form = { fullName: fullName || '', username: username || '' };
  const fail = (msg) =>
    res.status(400).render('register', { title: 'Uye Ol', error: msg, form });

  if (!fullName || !fullName.trim()) return fail('Ad Soyad gerekli.');
  if (!username || !username.trim() || username.trim().length < 3)
    return fail('Kullanici adi en az 3 karakter olmali.');
  if (!/^[a-zA-Z0-9._]+$/.test(username.trim()))
    return fail('Kullanici adi sadece harf, rakam, nokta ve alt cizgi icerebilir.');
  if (!password || password.length < 6) return fail('Sifre en az 6 karakter olmali.');
  if (password !== password2) return fail('Sifreler eslesmiyor.');
  if (db.users.findByUsername(username)) return fail('Bu kullanici adi zaten alinmis.');

  db.users.create({
    username,
    fullName,
    passwordHash: hashPassword(password),
    role: 'user',
    status: 'pending'
  });
  res.render('register', {
    title: 'Uye Ol',
    error: null,
    form: {},
    success: 'Kaydiniz alindi! Hesabiniz yonetici onayindan sonra aktiflesecek. Onaylandiktan sonra giris yapabilirsiniz.'
  });
});

// ---------- Ana Sayfa (Panel) ----------
app.get('/', (req, res) => {
  // Giris yapmamis ziyaretciler -> herkese acik tanitim sayfasi
  if (!req.session.userId) {
    return res.render('landing', {
      title: 'Bilisim Evrak Arsivi',
      categories: db.categories.all()
    });
  }
  // Giris yapmis kullanicilar -> panel
  const categories = db.categories.all().map((c) => ({
    ...c,
    count: db.documents.countByCategory(c.id)
  }));
  const recent = db.documents.all().slice(0, 8);
  const categoryMap = {};
  db.categories.all().forEach((c) => (categoryMap[c.id] = c));
  res.render('dashboard', {
    title: 'Ana Sayfa',
    categories,
    recent,
    categoryMap,
    totalDocs: db.documents.all().length
  });
});

// ---------- Kategori detayi (evrak listesi) ----------
app.get('/kategori/:slug', requireAuth, (req, res) => {
  const category = db.categories.findBySlug(req.params.slug);
  if (!category) {
    return res.status(404).render('error', {
      title: 'Bulunamadi',
      message: 'Boyle bir kategori bulunamadi.'
    });
  }
  const documents = db.documents.byCategory(category.id);
  const subs = db.subcategories.byCategory(category.id).map((s) => ({
    ...s,
    count: db.documents.countBySubcategory(s.id)
  }));
  // Bu kategorideki evraklarda kullanilan donemler (sayilariyla)
  const termList = db.terms.all()
    .map((t) => ({
      ...t,
      count: documents.filter((d) => d.termId === t.id).length
    }))
    .filter((t) => t.count > 0);
  res.render('category', {
    title: category.name,
    category,
    documents,
    subcategories: subs,
    terms: termList
  });
});

// ---------- Arama ----------
app.get('/ara', requireAuth, (req, res) => {
  const q = (req.query.q || '').trim();
  const results = q ? db.documents.search(q) : [];
  const categoryMap = {};
  db.categories.all().forEach((c) => (categoryMap[c.id] = c));
  res.render('search', { title: 'Arama', q, results, categoryMap });
});

// ---------- Evrak yukleme ----------
app.get('/yukle', requireAuth, requireAdmin, (req, res) => {
  const preselect = req.query.kategori || '';
  res.render('upload', {
    title: 'Evrak Yukle',
    categories: db.categories.all(),
    subcategories: db.subcategories.all(),
    terms: db.terms.all(),
    preselect
  });
});

app.post('/yukle', requireAuth, requireAdmin, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      setFlash(req, 'error', 'Yukleme hatasi: ' + err.message);
      return res.redirect('/yukle');
    }
    if (!req.file) {
      setFlash(req, 'error', 'Lutfen bir dosya secin.');
      return res.redirect('/yukle');
    }
    const { title, description, categoryId, subcategoryId, newSubcategory, termId, newTerm } = req.body;
    const category = db.categories.findById(categoryId);
    if (!category) {
      // Gecersiz kategori -> yuklenen dosyayi sil
      fs.unlink(path.join(UPLOAD_DIR, req.file.filename), () => {});
      setFlash(req, 'error', 'Gecerli bir kategori secin.');
      return res.redirect('/yukle');
    }
    // Alt kategoriyi coz: yeni isim girildiyse olustur, yoksa secileni kullan
    let subId = null;
    if (newSubcategory && newSubcategory.trim()) {
      let sub = db.subcategories.findByNameInCategory(category.id, newSubcategory);
      if (!sub) sub = db.subcategories.create({ categoryId: category.id, name: newSubcategory });
      subId = sub.id;
    } else if (subcategoryId) {
      const sub = db.subcategories.findById(subcategoryId);
      if (sub && sub.categoryId === category.id) subId = sub.id;
    }
    // Donemi coz
    const tId = resolveTerm(termId, newTerm);
    db.documents.create({
      title: (title || req.file.originalname).trim(),
      description: description || '',
      categoryId: category.id,
      subcategoryId: subId,
      termId: tId,
      storedName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.session.user.id,
      uploadedByName: req.session.user.fullName || req.session.user.username
    });
    setFlash(req, 'success', 'Evrak basariyla yuklendi.');
    res.redirect('/kategori/' + category.slug);
  });
});

// ---------- Evrak indirme ----------
app.get('/indir/:id', requireAuth, (req, res) => {
  const doc = db.documents.findById(req.params.id);
  if (!doc) {
    return res.status(404).render('error', {
      title: 'Bulunamadi',
      message: 'Evrak bulunamadi.'
    });
  }
  const filePath = path.join(UPLOAD_DIR, doc.storedName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).render('error', {
      title: 'Dosya Yok',
      message: 'Dosya sunucuda bulunamadi.'
    });
  }
  res.download(filePath, doc.originalName);
});

// ---------- Evrak goruntuleme (tarayicida ac) ----------
app.get('/goster/:id', requireAuth, (req, res) => {
  const doc = db.documents.findById(req.params.id);
  if (!doc) {
    return res.status(404).render('error', { title: 'Bulunamadi', message: 'Evrak bulunamadi.' });
  }
  const filePath = path.join(UPLOAD_DIR, doc.storedName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).render('error', { title: 'Dosya Yok', message: 'Dosya bulunamadi.' });
  }
  res.setHeader('Content-Disposition', 'inline; filename="' + encodeURIComponent(doc.originalName) + '"');
  res.sendFile(filePath);
});

// ---------- Evrak onizleme (site icinde) ----------
app.get('/onizle/:id', requireAuth, (req, res) => {
  const doc = db.documents.findById(req.params.id);
  if (!doc) {
    return res.status(404).render('error', { title: 'Bulunamadi', message: 'Evrak bulunamadi.' });
  }
  const category = db.categories.findById(doc.categoryId);
  res.render('preview', { title: doc.title, doc, category, kind: previewKind(doc.originalName) });
});

// ---------- Evrak bilgisi duzenleme (yukleyen kisi veya admin) ----------
app.get('/evrak/:id/duzenle', requireAuth, requireAdmin, (req, res) => {
  const doc = db.documents.findById(req.params.id);
  if (!doc) {
    return res.status(404).render('error', { title: 'Bulunamadi', message: 'Evrak bulunamadi.' });
  }
  res.render('edit', {
    title: 'Evrak Duzenle',
    doc,
    categories: db.categories.all(),
    subcategories: db.subcategories.all(),
    terms: db.terms.all()
  });
});

app.post('/evrak/:id/duzenle', requireAuth, requireAdmin, (req, res) => {
  const doc = db.documents.findById(req.params.id);
  if (!doc) {
    setFlash(req, 'error', 'Evrak bulunamadi.');
    return res.redirect('/');
  }
  const { title, description, categoryId, subcategoryId, newSubcategory, termId, newTerm } = req.body;
  const category = db.categories.findById(categoryId);
  if (!category) {
    setFlash(req, 'error', 'Gecerli bir kategori secin.');
    return res.redirect('/evrak/' + doc.id + '/duzenle');
  }
  // Alt kategoriyi coz (yukleme ile ayni mantik)
  let subId = null;
  if (newSubcategory && newSubcategory.trim()) {
    let sub = db.subcategories.findByNameInCategory(category.id, newSubcategory);
    if (!sub) sub = db.subcategories.create({ categoryId: category.id, name: newSubcategory });
    subId = sub.id;
  } else if (subcategoryId) {
    const sub = db.subcategories.findById(subcategoryId);
    if (sub && sub.categoryId === category.id) subId = sub.id;
  }
  db.documents.update(doc.id, {
    title: (title || doc.originalName).trim(),
    description: description || '',
    categoryId: category.id,
    subcategoryId: subId,
    termId: resolveTerm(termId, newTerm)
  });
  setFlash(req, 'success', 'Evrak bilgileri guncellendi.');
  res.redirect('/kategori/' + category.slug);
});

// ---------- Evrak silme (yukleyen kisi veya admin) ----------
app.post('/evrak/:id/sil', requireAuth, requireAdmin, (req, res) => {
  const doc = db.documents.findById(req.params.id);
  if (!doc) {
    setFlash(req, 'error', 'Evrak bulunamadi.');
    return res.redirect('/');
  }
  db.documents.remove(doc.id);
  fs.unlink(path.join(UPLOAD_DIR, doc.storedName), () => {});
  setFlash(req, 'success', 'Evrak silindi.');
  const category = db.categories.findById(doc.categoryId);
  res.redirect(category ? '/kategori/' + category.slug : '/');
});

// ==================== HESABIM ====================
app.get('/hesabim', requireAuth, (req, res) => {
  res.render('account', { title: 'Hesabim' });
});

app.post('/hesabim/sifre', requireAuth, (req, res) => {
  const { currentPassword, newPassword, newPassword2 } = req.body;
  const user = db.users.findById(req.session.user.id);
  if (!user || !verifyPassword(currentPassword || '', user.passwordHash)) {
    setFlash(req, 'error', 'Mevcut sifreniz hatali.');
    return res.redirect('/hesabim');
  }
  if (!newPassword || newPassword.length < 6) {
    setFlash(req, 'error', 'Yeni sifre en az 6 karakter olmali.');
    return res.redirect('/hesabim');
  }
  if (newPassword !== newPassword2) {
    setFlash(req, 'error', 'Yeni sifreler eslesmiyor.');
    return res.redirect('/hesabim');
  }
  db.users.update(user.id, { passwordHash: hashPassword(newPassword) });
  setFlash(req, 'success', 'Sifreniz guncellendi.');
  res.redirect('/hesabim');
});

// ==================== YONETIM (sadece admin) ====================

// ---------- Kategori yonetimi ----------
app.get('/yonetim/kategoriler', requireAuth, requireAdmin, (req, res) => {
  const categories = db.categories.all().map((c) => ({
    ...c,
    count: db.documents.countByCategory(c.id),
    subcategories: db.subcategories.byCategory(c.id).map((s) => ({
      ...s,
      count: db.documents.countBySubcategory(s.id)
    }))
  }));
  res.render('admin/categories', { title: 'Kategori Yonetimi', categories });
});

app.post('/yonetim/kategoriler', requireAuth, requireAdmin, (req, res) => {
  const { name, icon } = req.body;
  if (!name || !name.trim()) {
    setFlash(req, 'error', 'Kategori adi bos olamaz.');
    return res.redirect('/yonetim/kategoriler');
  }
  const slug = db.slugify(name);
  if (db.categories.findBySlug(slug)) {
    setFlash(req, 'error', 'Bu isimde bir kategori zaten var.');
    return res.redirect('/yonetim/kategoriler');
  }
  db.categories.create({ name, icon });
  setFlash(req, 'success', 'Kategori eklendi.');
  res.redirect('/yonetim/kategoriler');
});

app.post('/yonetim/kategoriler/:id/sil', requireAuth, requireAdmin, (req, res) => {
  const category = db.categories.findById(req.params.id);
  if (!category) {
    setFlash(req, 'error', 'Kategori bulunamadi.');
    return res.redirect('/yonetim/kategoriler');
  }
  const count = db.documents.countByCategory(category.id);
  if (count > 0) {
    setFlash(req, 'error', `Bu kategoride ${count} evrak var. Once onlari silin veya tasiyin.`);
    return res.redirect('/yonetim/kategoriler');
  }
  db.categories.remove(category.id);
  setFlash(req, 'success', 'Kategori silindi.');
  res.redirect('/yonetim/kategoriler');
});

// ---------- Alt kategori yonetimi ----------
app.post('/yonetim/kategoriler/:id/alt-ekle', requireAuth, requireAdmin, (req, res) => {
  const category = db.categories.findById(req.params.id);
  const { name } = req.body;
  if (!category) {
    setFlash(req, 'error', 'Kategori bulunamadi.');
    return res.redirect('/yonetim/kategoriler');
  }
  if (!name || !name.trim()) {
    setFlash(req, 'error', 'Alt kategori adi bos olamaz.');
    return res.redirect('/yonetim/kategoriler');
  }
  if (db.subcategories.findByNameInCategory(category.id, name)) {
    setFlash(req, 'error', 'Bu kategoride ayni isimde alt kategori zaten var.');
    return res.redirect('/yonetim/kategoriler');
  }
  db.subcategories.create({ categoryId: category.id, name });
  setFlash(req, 'success', 'Alt kategori eklendi.');
  res.redirect('/yonetim/kategoriler');
});

app.post('/yonetim/alt-kategori/:id/sil', requireAuth, requireAdmin, (req, res) => {
  const sub = db.subcategories.findById(req.params.id);
  if (!sub) {
    setFlash(req, 'error', 'Alt kategori bulunamadi.');
    return res.redirect('/yonetim/kategoriler');
  }
  db.subcategories.remove(sub.id);
  setFlash(req, 'success', 'Alt kategori silindi. (Evraklar silinmedi, sadece alt kategorisi kaldirildi.)');
  res.redirect('/yonetim/kategoriler');
});

// ---------- Ogretim donemi yonetimi ----------
app.get('/yonetim/donemler', requireAuth, requireAdmin, (req, res) => {
  const terms = db.terms.all().map((t) => ({
    ...t,
    count: db.documents.countByTerm(t.id)
  }));
  res.render('admin/terms', { title: 'Donem Yonetimi', terms });
});

app.post('/yonetim/donemler', requireAuth, requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    setFlash(req, 'error', 'Donem adi bos olamaz.');
    return res.redirect('/yonetim/donemler');
  }
  if (db.terms.findByName(name)) {
    setFlash(req, 'error', 'Bu donem zaten var.');
    return res.redirect('/yonetim/donemler');
  }
  db.terms.create({ name });
  setFlash(req, 'success', 'Donem eklendi.');
  res.redirect('/yonetim/donemler');
});

app.post('/yonetim/donemler/:id/sil', requireAuth, requireAdmin, (req, res) => {
  const term = db.terms.findById(req.params.id);
  if (!term) {
    setFlash(req, 'error', 'Donem bulunamadi.');
    return res.redirect('/yonetim/donemler');
  }
  db.terms.remove(term.id);
  setFlash(req, 'success', 'Donem silindi. (Evraklar silinmedi, sadece donem bilgisi kaldirildi.)');
  res.redirect('/yonetim/donemler');
});

// ---------- Tani (teshis) sayfasi: veri klasorleri dogru mu? ----------
app.get('/yonetim/tani', requireAuth, requireAdmin, (req, res) => {
  function check(dir) {
    const result = { dir, exists: false, writable: false, error: null };
    try {
      result.exists = fs.existsSync(dir);
      const testFile = path.join(dir, '.yazma-testi-' + Date.now());
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      result.writable = true;
    } catch (e) {
      result.error = e.message;
    }
    return result;
  }
  const dataCheck = check(db.DATA_DIR);
  const uploadCheck = check(UPLOAD_DIR);
  const dbExists = fs.existsSync(db.DB_FILE);

  const row = (label, value, ok) =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${label}</td>
     <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace">${value}</td>
     <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${ok ? '✅' : '❌'}</td></tr>`;

  const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">
    <title>Tani</title><link rel="stylesheet" href="/public/css/style.css"></head>
    <body><main class="container">
    <div class="breadcrumb"><a href="/">Ana Sayfa</a> / Yonetim / Tani</div>
    <h1>🔧 Sistem Tani</h1>
    <p class="muted">Veri klasorlerinin dogru ayarlanip ayarlanmadigini gosterir.</p>
    <div class="table-wrap"><table class="table" style="width:100%">
      <tr><th style="text-align:left;padding:8px 12px">Ayar</th><th style="text-align:left;padding:8px 12px">Deger</th><th style="padding:8px 12px">Durum</th></tr>
      ${row('DATA_DIR (env degeri)', process.env.DATA_DIR || '(BOS - ayarlanmamis!)', !!process.env.DATA_DIR)}
      ${row('Kullanilan kayit klasoru', db.DATA_DIR, dataCheck.writable)}
      ${row('Kayit klasoru yazilabilir mi', dataCheck.writable ? 'Evet' : 'HAYIR: ' + (dataCheck.error || ''), dataCheck.writable)}
      ${row('db.json mevcut mu', dbExists ? 'Evet' : 'Hayir (henuz olusmadi)', dbExists)}
      ${row('UPLOADS_DIR (env degeri)', process.env.UPLOADS_DIR || '(BOS - ayarlanmamis!)', !!process.env.UPLOADS_DIR)}
      ${row('Kullanilan dosya klasoru', UPLOAD_DIR, uploadCheck.writable)}
      ${row('Dosya klasoru yazilabilir mi', uploadCheck.writable ? 'Evet' : 'HAYIR: ' + (uploadCheck.error || ''), uploadCheck.writable)}
    </table></div>
    <p style="margin-top:16px"><strong>Yorum:</strong> ${
      process.env.DATA_DIR && dataCheck.writable && process.env.UPLOADS_DIR && uploadCheck.writable
        ? '🎉 Her sey dogru! Veriler kalici klasorlerde, deploy-guvenli.'
        : !process.env.DATA_DIR || !process.env.UPLOADS_DIR
          ? '⚠️ Ortam degiskenleri okunmamis. Hostinger Node.js panelinde DATA_DIR / UPLOADS_DIR ekleyip uygulamayi RESTART edin.'
          : '⚠️ Klasor yazilabilir degil. Yolu kontrol edin.'
    }</p>
    <p><a href="/" class="btn">← Ana Sayfa</a></p>
    </main></body></html>`;
  res.send(html);
});

// ---------- Yedek / Veri ozeti ----------
app.get('/yonetim/yedek', requireAuth, requireAdmin, (req, res) => {
  const docs = db.documents.all();
  const dbStat = fs.existsSync(db.DB_FILE) ? fs.statSync(db.DB_FILE) : null;
  let uploadFiles = [];
  try {
    uploadFiles = fs.readdirSync(UPLOAD_DIR).filter((f) => !f.startsWith('.'));
  } catch (e) {
    // klasor okunamadi
  }
  let uploadTotal = 0;
  uploadFiles.forEach((f) => {
    try {
      uploadTotal += fs.statSync(path.join(UPLOAD_DIR, f)).size;
    } catch (e) {}
  });
  res.render('admin/backup', {
    title: 'Yedek ve Veri Ozeti',
    docs,
    catCount: db.categories.all().length,
    subCount: db.subcategories.all().length,
    termCount: db.terms.all().length,
    userCount: db.users.all().length,
    dbSize: dbStat ? dbStat.size : 0,
    dbMtime: dbStat ? dbStat.mtime.toISOString() : null,
    uploadCount: uploadFiles.length
  });
});

app.get('/yonetim/yedek/db.json', requireAuth, requireAdmin, (req, res) => {
  if (!fs.existsSync(db.DB_FILE)) {
    setFlash(req, 'error', 'Veri dosyasi (db.json) bulunamadi.');
    return res.redirect('/yonetim/yedek');
  }
  const today = new Date().toISOString().slice(0, 10);
  res.download(db.DB_FILE, `evrak-yedek-${today}.json`);
});

// ==================== YILLIK PLAN OLUSTURUCU ====================
app.get('/plan-olustur', requireAuth, requireAdmin, (req, res) => {
  res.render('plan/create', { title: 'Yillik Plan Olustur', curricula: db.curricula.all(), terms: db.terms.all() });
});

app.post('/plan-olustur', requireAuth, requireAdmin, async (req, res) => {
  const { curriculumId, province, district, school, term, className, principalName, saveArchive } = req.body;
  const cur = db.curricula.findById(curriculumId);
  if (!cur) {
    setFlash(req, 'error', 'Lutfen bir mufredat (ders) secin.');
    return res.redirect('/plan-olustur');
  }
  if (!cur.rows || cur.rows.length === 0) {
    setFlash(req, 'error', 'Bu mufredatta henuz konu/kazanim satiri yok. Once Yonetim > Mufredat\'tan ekleyin.');
    return res.redirect('/plan-olustur');
  }
  try {
    // Hedef yilin takvimi tanimliysa hafta tarihlerini/tatilleri otomatik uyarla
    const cal = CALENDARS[term];
    const planRows = cal ? adaptRows(cur.rows, cal) : cur.rows;
    const buf = await generatePlanBuffer({
      term, province, district, school,
      area: cur.area,
      gradeLevel: cur.gradeLevel,
      courseName: cur.courseName || cur.name,
      weeklyHours: cur.weeklyHours,
      rows: planRows,
      defaultMethods: cur.defaultMethods,
      defaultTools: cur.defaultTools,
      signTeachers: cur.signTeachers,
      principalName: principalName || cur.principalName
    });
    const safe = (s) => String(s || '').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40);
    const niceName = `Yillik_Plan_${safe(cur.courseName || cur.name)}_${safe(className)}_${safe(term)}.docx`;
    const storedName = crypto.randomUUID() + '.docx';
    const filePath = path.join(UPLOAD_DIR, storedName);
    fs.writeFileSync(filePath, buf);

    if (saveArchive) {
      const category =
        db.categories.all().find((c) => c.slug === 'yillik-planlar') || db.categories.all()[0];
      if (category) {
        const t = db.terms.findByName(term);
        db.documents.create({
          title: (cur.name || 'Yillik Plan') + (className ? ' - ' + className : '') + (term ? ' (' + term + ')' : ''),
          description: 'Sistemden otomatik olusturulan yillik plan.',
          categoryId: category.id,
          termId: t ? t.id : null,
          storedName,
          originalName: niceName,
          size: buf.length,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          uploadedBy: req.session.user.id,
          uploadedByName: req.session.user.fullName || req.session.user.username
        });
      }
      return res.download(filePath, niceName);
    }
    // Arsive kaydetme -> indir, sonra gecici dosyayi sil
    return res.download(filePath, niceName, () => fs.unlink(filePath, () => {}));
  } catch (e) {
    console.error('[plan] uretim hatasi', e);
    setFlash(req, 'error', 'Plan olusturulamadi: ' + e.message);
    return res.redirect('/plan-olustur');
  }
});

// ---------- Mufredat (plan sablonu) yonetimi ----------
app.get('/yonetim/mufredat', requireAuth, requireAdmin, (req, res) => {
  res.render('admin/curricula', { title: 'Mufredat Yonetimi', curricula: db.curricula.all() });
});

app.post('/yonetim/mufredat', requireAuth, requireAdmin, (req, res) => {
  const { name, area, gradeLevel, courseName, weeklyHours } = req.body;
  if (!name || !name.trim()) {
    setFlash(req, 'error', 'Mufredat adi gerekli.');
    return res.redirect('/yonetim/mufredat');
  }
  const cur = db.curricula.create({ name, area, gradeLevel, courseName, weeklyHours });
  setFlash(req, 'success', 'Mufredat olusturuldu. Simdi konu/kazanim satirlarini ekleyin.');
  res.redirect('/yonetim/mufredat/' + cur.id);
});

app.get('/yonetim/mufredat/:id', requireAuth, requireAdmin, (req, res) => {
  const cur = db.curricula.findById(req.params.id);
  if (!cur) return res.status(404).render('error', { title: 'Bulunamadi', message: 'Mufredat bulunamadi.' });
  res.render('admin/curriculum-edit', { title: 'Mufredat Duzenle', cur });
});

app.post('/yonetim/mufredat/:id', requireAuth, requireAdmin, (req, res) => {
  const cur = db.curricula.findById(req.params.id);
  if (!cur) {
    setFlash(req, 'error', 'Mufredat bulunamadi.');
    return res.redirect('/yonetim/mufredat');
  }
  const { name, area, gradeLevel, courseName, weeklyHours, defaultMethods, defaultTools, signTeachers, principalName } = req.body;
  db.curricula.update(cur.id, {
    name: (name || cur.name).trim(),
    area: (area || '').trim(),
    gradeLevel: (gradeLevel || '').trim(),
    courseName: (courseName || '').trim(),
    weeklyHours: parseInt(weeklyHours, 10) || 0,
    defaultMethods: (defaultMethods || '').trim(),
    defaultTools: (defaultTools || '').trim(),
    signTeachers: String(signTeachers || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
    principalName: (principalName || '').trim()
  });
  setFlash(req, 'success', 'Mufredat bilgileri kaydedildi.');
  res.redirect('/yonetim/mufredat/' + cur.id);
});

app.post('/yonetim/mufredat/:id/satirlar', requireAuth, requireAdmin, (req, res) => {
  const cur = db.curricula.findById(req.params.id);
  if (!cur) {
    setFlash(req, 'error', 'Mufredat bulunamadi.');
    return res.redirect('/yonetim/mufredat');
  }
  const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  const month = arr(req.body.month), week = arr(req.body.week), hours = arr(req.body.hours),
    objectives = arr(req.body.objectives), topic = arr(req.body.topic), methods = arr(req.body.methods),
    tools = arr(req.body.tools), notes = arr(req.body.notes), banner = arr(req.body.banner);
  const rows = [];
  for (let i = 0; i < month.length; i++) {
    if ((banner[i] || '').trim()) {
      rows.push({ banner: banner[i].trim() });
      continue;
    }
    const r = {
      month: (month[i] || '').trim(), week: (week[i] || '').trim(), hours: (hours[i] || '').trim(),
      objectives: (objectives[i] || '').trim(), topic: (topic[i] || '').trim(),
      methods: (methods[i] || '').trim(), tools: (tools[i] || '').trim(), notes: (notes[i] || '').trim()
    };
    if (Object.values(r).some((v) => v)) rows.push(r);
  }
  db.curricula.update(cur.id, { rows });
  setFlash(req, 'success', rows.length + ' satir kaydedildi.');
  res.redirect('/yonetim/mufredat/' + cur.id);
});

app.post('/yonetim/mufredat/:id/sil', requireAuth, requireAdmin, (req, res) => {
  const cur = db.curricula.findById(req.params.id);
  if (!cur) {
    setFlash(req, 'error', 'Mufredat bulunamadi.');
    return res.redirect('/yonetim/mufredat');
  }
  db.curricula.remove(cur.id);
  setFlash(req, 'success', 'Mufredat silindi.');
  res.redirect('/yonetim/mufredat');
});

// ==================== ZÜMRE TUTANAĞI OLUŞTURUCU ====================
app.get('/zumre-olustur', requireAuth, requireAdmin, (req, res) => {
  res.render('zumre/create', { title: 'Zümre Tutanağı Oluştur', zumreler: db.zumreler.all(), terms: db.terms.all() });
});

app.post('/zumre-olustur', requireAuth, requireAdmin, async (req, res) => {
  const { zumreId, term, school, area, meetingNo, date, time, place, principalName, saveArchive } = req.body;
  const z = db.zumreler.findById(zumreId);
  if (!z) {
    setFlash(req, 'error', 'Lutfen bir zümre şablonu secin.');
    return res.redirect('/zumre-olustur');
  }
  try {
    const buf = await generateZumreBuffer({
      term, school, area: area || z.area, meetingTitle: z.meetingTitle,
      meetingNo, date, time, place,
      attendees: z.attendees, agenda: z.agenda, discussions: z.discussions, decisions: z.decisions,
      signers: z.signers, principalName: principalName || z.principalName, principalTitle: z.principalTitle
    });
    const safe = (s) => String(s || '').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40);
    const niceName = `Zumre_${safe(z.name)}_${safe(term)}.docx`;
    const storedName = crypto.randomUUID() + '.docx';
    const filePath = path.join(UPLOAD_DIR, storedName);
    fs.writeFileSync(filePath, buf);
    if (saveArchive) {
      const category =
        db.categories.all().find((c) => c.slug === 'zumreler') ||
        db.categories.all().find((c) => /z[üu]mre/i.test(c.name));
      if (category) {
        const t = db.terms.findByName(term);
        db.documents.create({
          title: z.name + (term ? ' (' + term + ')' : ''),
          description: 'Sistemden otomatik olusturulan zümre tutanağı.',
          categoryId: category.id, termId: t ? t.id : null,
          storedName, originalName: niceName, size: buf.length,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          uploadedBy: req.session.user.id, uploadedByName: req.session.user.fullName || req.session.user.username
        });
      }
      return res.download(filePath, niceName);
    }
    return res.download(filePath, niceName, () => fs.unlink(filePath, () => {}));
  } catch (e) {
    console.error('[zumre] uretim hatasi', e);
    setFlash(req, 'error', 'Zümre olusturulamadi: ' + e.message);
    return res.redirect('/zumre-olustur');
  }
});

// ---------- Zümre şablonu yonetimi ----------
app.get('/yonetim/zumreler', requireAuth, requireAdmin, (req, res) => {
  res.render('admin/zumreler', { title: 'Zümre Şablonları', zumreler: db.zumreler.all() });
});

app.post('/yonetim/zumreler', requireAuth, requireAdmin, (req, res) => {
  const { name, meetingTitle, area } = req.body;
  if (!name || !name.trim()) {
    setFlash(req, 'error', 'Şablon adi gerekli.');
    return res.redirect('/yonetim/zumreler');
  }
  const z = db.zumreler.create({ name: name.trim(), meetingTitle: (meetingTitle || '').trim(), area: (area || 'Bilişim Teknolojileri Alanı').trim() });
  setFlash(req, 'success', 'Zümre şablonu olusturuldu. Simdi icerigini doldurun.');
  res.redirect('/yonetim/zumreler/' + z.id);
});

app.get('/yonetim/zumreler/:id', requireAuth, requireAdmin, (req, res) => {
  const z = db.zumreler.findById(req.params.id);
  if (!z) return res.status(404).render('error', { title: 'Bulunamadi', message: 'Zümre şablonu bulunamadi.' });
  res.render('admin/zumre-edit', { title: 'Zümre Şablonu Düzenle', z });
});

app.post('/yonetim/zumreler/:id', requireAuth, requireAdmin, (req, res) => {
  const z = db.zumreler.findById(req.params.id);
  if (!z) {
    setFlash(req, 'error', 'Zümre şablonu bulunamadi.');
    return res.redirect('/yonetim/zumreler');
  }
  const lines = (s) => String(s || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const blocks = (s) => String(s || '').split(/\r?\n\s*\r?\n/).map((x) => x.replace(/\s+$/g, '').trim()).filter(Boolean);
  const signers = lines(req.body.signers).map((l) => {
    const i = l.indexOf('|');
    return i >= 0 ? { name: l.slice(0, i).trim(), role: l.slice(i + 1).trim() } : { name: l, role: '' };
  });
  db.zumreler.update(z.id, {
    name: (req.body.name || z.name).trim(),
    meetingTitle: (req.body.meetingTitle || '').trim(),
    area: (req.body.area || '').trim(),
    principalName: (req.body.principalName || '').trim(),
    principalTitle: (req.body.principalTitle || 'Okul Müdürü').trim(),
    attendees: lines(req.body.attendees),
    agenda: lines(req.body.agenda),
    discussions: blocks(req.body.discussions),
    decisions: lines(req.body.decisions),
    signers
  });
  setFlash(req, 'success', 'Zümre şablonu kaydedildi.');
  res.redirect('/yonetim/zumreler/' + z.id);
});

app.post('/yonetim/zumreler/:id/sil', requireAuth, requireAdmin, (req, res) => {
  const z = db.zumreler.findById(req.params.id);
  if (!z) {
    setFlash(req, 'error', 'Zümre şablonu bulunamadi.');
    return res.redirect('/yonetim/zumreler');
  }
  db.zumreler.remove(z.id);
  setFlash(req, 'success', 'Zümre şablonu silindi.');
  res.redirect('/yonetim/zumreler');
});

// ---------- Kullanici yonetimi ----------
app.get('/yonetim/kullanicilar', requireAuth, requireAdmin, (req, res) => {
  res.render('admin/users', {
    title: 'Kullanici Yonetimi',
    pending: db.users.pending(),
    users: db.users.all().filter((u) => u.status !== 'pending')
  });
});

app.post('/yonetim/kullanicilar/:id/onayla', requireAuth, requireAdmin, (req, res) => {
  const user = db.users.findById(req.params.id);
  if (!user) {
    setFlash(req, 'error', 'Kullanici bulunamadi.');
    return res.redirect('/yonetim/kullanicilar');
  }
  db.users.update(user.id, { status: 'approved' });
  setFlash(req, 'success', `${user.username} onaylandi, artik giris yapabilir.`);
  res.redirect('/yonetim/kullanicilar');
});

app.post('/yonetim/kullanicilar', requireAuth, requireAdmin, (req, res) => {
  const { username, fullName, password, role } = req.body;
  if (!username || !username.trim() || !password || password.length < 6) {
    setFlash(req, 'error', 'Kullanici adi gerekli ve sifre en az 6 karakter olmali.');
    return res.redirect('/yonetim/kullanicilar');
  }
  if (db.users.findByUsername(username)) {
    setFlash(req, 'error', 'Bu kullanici adi zaten kullaniliyor.');
    return res.redirect('/yonetim/kullanicilar');
  }
  db.users.create({
    username,
    fullName,
    passwordHash: hashPassword(password),
    role
  });
  setFlash(req, 'success', 'Kullanici olusturuldu.');
  res.redirect('/yonetim/kullanicilar');
});

app.post('/yonetim/kullanicilar/:id/sifre', requireAuth, requireAdmin, (req, res) => {
  const user = db.users.findById(req.params.id);
  const { password } = req.body;
  if (!user) {
    setFlash(req, 'error', 'Kullanici bulunamadi.');
    return res.redirect('/yonetim/kullanicilar');
  }
  if (!password || password.length < 6) {
    setFlash(req, 'error', 'Sifre en az 6 karakter olmali.');
    return res.redirect('/yonetim/kullanicilar');
  }
  db.users.update(user.id, { passwordHash: hashPassword(password) });
  setFlash(req, 'success', `${user.username} kullanicisinin sifresi degistirildi.`);
  res.redirect('/yonetim/kullanicilar');
});

app.post('/yonetim/kullanicilar/:id/sil', requireAuth, requireAdmin, (req, res) => {
  const user = db.users.findById(req.params.id);
  if (!user) {
    setFlash(req, 'error', 'Kullanici bulunamadi.');
    return res.redirect('/yonetim/kullanicilar');
  }
  if (user.id === req.session.user.id) {
    setFlash(req, 'error', 'Kendi hesabinizi silemezsiniz.');
    return res.redirect('/yonetim/kullanicilar');
  }
  if (user.role === 'admin' && db.users.countAdmins() <= 1) {
    setFlash(req, 'error', 'Son yonetici hesabi silinemez.');
    return res.redirect('/yonetim/kullanicilar');
  }
  db.users.remove(user.id);
  setFlash(req, 'success', 'Kullanici silindi.');
  res.redirect('/yonetim/kullanicilar');
});

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Sayfa Bulunamadi',
    message: 'Aradiginiz sayfa bulunamadi.'
  });
});

// ---------- Hata yakalama ----------
app.use((err, req, res, next) => {
  console.error('[hata]', err);
  res.status(500).render('error', {
    title: 'Sunucu Hatasi',
    message: 'Beklenmeyen bir hata olustu. Lutfen tekrar deneyin.'
  });
});

app.listen(PORT, () => {
  console.log(`\n✅ Bilisim Evrak sistemi calisiyor:  http://localhost:${PORT}\n`);
});
