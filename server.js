'use strict';

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);

const db = require('./src/db');
const { hashPassword, verifyPassword, requireAuth, requireAdmin } = require('./src/auth');
const { upload, UPLOAD_DIR } = require('./src/upload');

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

// ---------- Ana Sayfa (Panel) ----------
app.get('/', requireAuth, (req, res) => {
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
app.get('/yukle', requireAuth, (req, res) => {
  const preselect = req.query.kategori || '';
  res.render('upload', {
    title: 'Evrak Yukle',
    categories: db.categories.all(),
    subcategories: db.subcategories.all(),
    terms: db.terms.all(),
    preselect
  });
});

app.post('/yukle', requireAuth, (req, res) => {
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
app.get('/evrak/:id/duzenle', requireAuth, (req, res) => {
  const doc = db.documents.findById(req.params.id);
  if (!doc) {
    return res.status(404).render('error', { title: 'Bulunamadi', message: 'Evrak bulunamadi.' });
  }
  const isOwner = doc.uploadedBy === req.session.user.id;
  if (!isOwner && req.session.user.role !== 'admin') {
    return res.status(403).render('error', { title: 'Yetkisiz', message: 'Bu evraki duzenleme yetkiniz yok.' });
  }
  res.render('edit', {
    title: 'Evrak Duzenle',
    doc,
    categories: db.categories.all(),
    subcategories: db.subcategories.all(),
    terms: db.terms.all()
  });
});

app.post('/evrak/:id/duzenle', requireAuth, (req, res) => {
  const doc = db.documents.findById(req.params.id);
  if (!doc) {
    setFlash(req, 'error', 'Evrak bulunamadi.');
    return res.redirect('/');
  }
  const isOwner = doc.uploadedBy === req.session.user.id;
  if (!isOwner && req.session.user.role !== 'admin') {
    return res.status(403).render('error', { title: 'Yetkisiz', message: 'Bu evraki duzenleme yetkiniz yok.' });
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
app.post('/evrak/:id/sil', requireAuth, (req, res) => {
  const doc = db.documents.findById(req.params.id);
  if (!doc) {
    setFlash(req, 'error', 'Evrak bulunamadi.');
    return res.redirect('/');
  }
  const isOwner = doc.uploadedBy === req.session.user.id;
  const isAdmin = req.session.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    setFlash(req, 'error', 'Bu evraki silme yetkiniz yok.');
    return res.redirect('back');
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

// ---------- Kullanici yonetimi ----------
app.get('/yonetim/kullanicilar', requireAuth, requireAdmin, (req, res) => {
  res.render('admin/users', { title: 'Kullanici Yonetimi', users: db.users.all() });
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
