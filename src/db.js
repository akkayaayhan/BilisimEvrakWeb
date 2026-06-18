'use strict';

/**
 * Basit, dosya tabanli JSON veri deposu.
 * Native derleme (sqlite vb.) gerektirmedigi icin Hostinger gibi paylasimli
 * Node.js ortamlarinda sorunsuz calisir.
 *
 * Veriler "data/db.json" icinde tutulur. Bu klasor .gitignore'da oldugu icin
 * GitHub'dan yapilan her deploy'da KORUNUR (silinmez).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Veri klasoru. Hostinger gibi her deploy'da calisma klasorunu temizleyen
// ortamlarda, DATA_DIR ortam degiskeni ile uygulama klasorunun DISINDA
// (orn. /home/kullanici/evrak-data) bir yer gosterilirse veriler ASLA silinmez.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Varsayilan kategoriler (ilk acilista olusturulur, sonra panelden yonetilir)
const DEFAULT_CATEGORIES = [
  { name: 'Yillik Planlar', icon: '📅' },
  { name: 'Zumreler', icon: '👥' },
  { name: 'Yazililar', icon: '📝' },
  { name: 'Seflik Evraklari', icon: '🗂️' },
  { name: 'Zanaat Atolyeleri', icon: '🔧' },
  { name: 'Acik Lise', icon: '🎓' },
  { name: 'Uygulama Sinavlari', icon: '🖥️' }
];

let db = {
  users: [],
  categories: [],
  subcategories: [],
  terms: [],
  curricula: [],
  documents: []
};

// Varsayilan ogretim donemleri (ilk acilista olusturulur, sonra panelden yonetilir)
const DEFAULT_TERMS = ['2025-2026', '2026-2027'];

// Hazir mufredat (yillik plan icerigi)
const MOBIL_CURRICULUM = require('./seed-mobil');
const SEED_COURSES = require('./seed-courses');

/** "Yillik Planlar" -> "yillik-planlar" */
function slugify(text) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', İ: 'i' };
  return String(text)
    .replace(/[çğıöşüİ]/g, (c) => map[c] || c)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function newId() {
  return crypto.randomUUID();
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function load() {
  console.log('[config] DATA_DIR (kayit klasoru) =', DATA_DIR);
  console.log('[config] DATA_DIR env degeri      =', process.env.DATA_DIR || '(BOS - okunmadi!)');
  ensureDataDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(raw);
      db.users = db.users || [];
      db.categories = db.categories || [];
      db.subcategories = db.subcategories || [];
      db.terms = db.terms || [];
      db.curricula = db.curricula || [];
      db.documents = db.documents || [];
    } catch (err) {
      console.error('[db] db.json okunamadi, bos veritabani ile baslaniyor:', err.message);
    }
  }
}

function save() {
  ensureDataDir();
  // Once gecici dosyaya yaz, sonra tasi -> bozuk dosya riskini azaltir
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

/**
 * Ilk acilista varsayilan kategorileri ve admin hesabini olusturur.
 * @param {(plain:string)=>string} hashPassword - sifre hashleme fonksiyonu
 */
function seed(hashPassword) {
  let changed = false;

  if (db.categories.length === 0) {
    db.categories = DEFAULT_CATEGORIES.map((c) => ({
      id: newId(),
      name: c.name,
      slug: slugify(c.name),
      icon: c.icon,
      createdAt: new Date().toISOString()
    }));
    changed = true;
    console.log('[db] Varsayilan kategoriler olusturuldu.');
  }

  if (db.terms.length === 0) {
    db.terms = DEFAULT_TERMS.map((name) => ({
      id: newId(),
      name,
      createdAt: new Date().toISOString()
    }));
    changed = true;
    console.log('[db] Varsayilan ogretim donemleri olusturuldu.');
  }

  // Eski otomatik "ORNEK" mufredati varsa temizle
  const beforeLen = db.curricula.length;
  db.curricula = db.curricula.filter((c) => !(c.name || '').startsWith('ÖRNEK - 10. Sınıf'));
  if (db.curricula.length !== beforeLen) changed = true;

  // Hazir Mobil Uygulamalar mufredatini ekle (yoksa)
  if (!db.curricula.some((c) => c.name === MOBIL_CURRICULUM.name)) {
    db.curricula.push({
      id: newId(),
      name: MOBIL_CURRICULUM.name,
      area: MOBIL_CURRICULUM.area,
      gradeLevel: MOBIL_CURRICULUM.gradeLevel,
      courseName: MOBIL_CURRICULUM.courseName,
      weeklyHours: MOBIL_CURRICULUM.weeklyHours,
      defaultMethods: MOBIL_CURRICULUM.defaultMethods,
      defaultTools: MOBIL_CURRICULUM.defaultTools,
      signTeachers: MOBIL_CURRICULUM.signTeachers,
      principalName: MOBIL_CURRICULUM.principalName,
      rows: MOBIL_CURRICULUM.rows,
      createdAt: new Date().toISOString()
    });
    changed = true;
    console.log('[db] Mobil Uygulamalar mufredati yuklendi.');
  }

  // Diger hazir ders mufredatlari (eksik olanlari ekle)
  SEED_COURSES.forEach((course) => {
    if (!db.curricula.some((c) => c.name === course.name)) {
      db.curricula.push(Object.assign({ id: newId(), createdAt: new Date().toISOString() }, course));
      changed = true;
      console.log('[db] Mufredat yuklendi: ' + course.name);
    }
  });

  if (db.users.length === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    db.users.push({
      id: newId(),
      username: username,
      fullName: 'Yonetici',
      passwordHash: hashPassword(password),
      role: 'admin',
      status: 'approved',
      createdAt: new Date().toISOString()
    });
    changed = true;
    console.log(`[db] Yonetici hesabi olusturuldu -> kullanici: "${username}"`);
    console.log('[db] LUTFEN giris yaptiktan sonra sifrenizi degistirin!');
  }

  if (changed) save();
}

// ---------------------- Kullanicilar ----------------------
const users = {
  all: () => db.users.slice().sort((a, b) => a.username.localeCompare(b.username, 'tr')),
  findById: (id) => db.users.find((u) => u.id === id),
  findByUsername: (username) =>
    db.users.find((u) => u.username.toLowerCase() === String(username).toLowerCase()),
  create: ({ username, fullName, passwordHash, role, status }) => {
    const user = {
      id: newId(),
      username: username.trim(),
      fullName: (fullName || '').trim(),
      passwordHash,
      role: role === 'admin' ? 'admin' : 'user',
      // 'pending' = yonetici onayi bekliyor, 'approved' = onayli
      status: status === 'pending' ? 'pending' : 'approved',
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    save();
    return user;
  },
  pending: () =>
    db.users
      .filter((u) => u.status === 'pending')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  countPending: () => db.users.filter((u) => u.status === 'pending').length,
  update: (id, patch) => {
    const user = db.users.find((u) => u.id === id);
    if (!user) return null;
    Object.assign(user, patch);
    save();
    return user;
  },
  remove: (id) => {
    const before = db.users.length;
    db.users = db.users.filter((u) => u.id !== id);
    if (db.users.length !== before) save();
  },
  countAdmins: () => db.users.filter((u) => u.role === 'admin').length
};

// ---------------------- Kategoriler ----------------------
const categories = {
  all: () => db.categories.slice().sort((a, b) => a.name.localeCompare(b.name, 'tr')),
  findById: (id) => db.categories.find((c) => c.id === id),
  findBySlug: (slug) => db.categories.find((c) => c.slug === slug),
  create: ({ name, icon }) => {
    const cat = {
      id: newId(),
      name: name.trim(),
      slug: slugify(name),
      icon: (icon || '📁').trim(),
      createdAt: new Date().toISOString()
    };
    db.categories.push(cat);
    save();
    return cat;
  },
  remove: (id) => {
    const before = db.categories.length;
    db.categories = db.categories.filter((c) => c.id !== id);
    // Kategoriye ait alt kategorileri de sil
    db.subcategories = db.subcategories.filter((s) => s.categoryId !== id);
    if (db.categories.length !== before) save();
  }
};

// ---------------------- Alt Kategoriler ----------------------
const subcategories = {
  all: () => db.subcategories.slice(),
  byCategory: (categoryId) =>
    db.subcategories
      .filter((s) => s.categoryId === categoryId)
      .sort((a, b) => a.name.localeCompare(b.name, 'tr')),
  findById: (id) => db.subcategories.find((s) => s.id === id),
  findByNameInCategory: (categoryId, name) =>
    db.subcategories.find(
      (s) => s.categoryId === categoryId && s.name.toLowerCase() === String(name).toLowerCase().trim()
    ),
  create: ({ categoryId, name }) => {
    const sub = {
      id: newId(),
      categoryId,
      name: name.trim(),
      slug: slugify(name),
      createdAt: new Date().toISOString()
    };
    db.subcategories.push(sub);
    save();
    return sub;
  },
  remove: (id) => {
    const before = db.subcategories.length;
    db.subcategories = db.subcategories.filter((s) => s.id !== id);
    // Bu alt kategorideki evraklarin alt kategorisini bosalt (evraklar silinmez)
    db.documents.forEach((d) => {
      if (d.subcategoryId === id) d.subcategoryId = null;
    });
    if (db.subcategories.length !== before) save();
  }
};

// ---------------------- Ogretim Donemleri ----------------------
const terms = {
  // En yeni donem ustte (2026-2027, 2025-2026, ...)
  all: () => db.terms.slice().sort((a, b) => b.name.localeCompare(a.name, 'tr')),
  findById: (id) => db.terms.find((t) => t.id === id),
  findByName: (name) =>
    db.terms.find((t) => t.name.toLowerCase() === String(name).toLowerCase().trim()),
  create: ({ name }) => {
    const term = {
      id: newId(),
      name: name.trim(),
      createdAt: new Date().toISOString()
    };
    db.terms.push(term);
    save();
    return term;
  },
  remove: (id) => {
    const before = db.terms.length;
    db.terms = db.terms.filter((t) => t.id !== id);
    // Bu doneme ait evraklarin donem bilgisini bosalt (evraklar silinmez)
    db.documents.forEach((d) => {
      if (d.termId === id) d.termId = null;
    });
    if (db.terms.length !== before) save();
  }
};

// ---------------------- Mufredat / Plan Sablonlari ----------------------
const curricula = {
  all: () => db.curricula.slice().sort((a, b) => a.name.localeCompare(b.name, 'tr')),
  findById: (id) => db.curricula.find((c) => c.id === id),
  create: (data) => {
    const cur = {
      id: newId(),
      name: (data.name || '').trim(),
      area: (data.area || '').trim(),
      gradeLevel: (data.gradeLevel || '').trim(),
      courseName: (data.courseName || '').trim(),
      weeklyHours: parseInt(data.weeklyHours, 10) || 0,
      defaultMethods: data.defaultMethods || '',
      defaultTools: data.defaultTools || '',
      signTeachers: Array.isArray(data.signTeachers) ? data.signTeachers : [],
      principalName: data.principalName || '',
      rows: Array.isArray(data.rows) ? data.rows : [],
      createdAt: new Date().toISOString()
    };
    db.curricula.push(cur);
    save();
    return cur;
  },
  update: (id, patch) => {
    const cur = db.curricula.find((c) => c.id === id);
    if (!cur) return null;
    Object.assign(cur, patch);
    save();
    return cur;
  },
  remove: (id) => {
    const before = db.curricula.length;
    db.curricula = db.curricula.filter((c) => c.id !== id);
    if (db.curricula.length !== before) save();
  }
};

// ---------------------- Evraklar (Dokumanlar) ----------------------
const documents = {
  all: () => db.documents.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findById: (id) => db.documents.find((d) => d.id === id),
  byCategory: (categoryId) =>
    db.documents
      .filter((d) => d.categoryId === categoryId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  countByCategory: (categoryId) => db.documents.filter((d) => d.categoryId === categoryId).length,
  countBySubcategory: (subcategoryId) =>
    db.documents.filter((d) => d.subcategoryId === subcategoryId).length,
  countByTerm: (termId) => db.documents.filter((d) => d.termId === termId).length,
  search: (query) => {
    const q = String(query).toLowerCase().trim();
    if (!q) return [];
    return db.documents
      .filter(
        (d) =>
          (d.title && d.title.toLowerCase().includes(q)) ||
          (d.description && d.description.toLowerCase().includes(q)) ||
          (d.originalName && d.originalName.toLowerCase().includes(q))
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  create: (doc) => {
    const record = {
      id: newId(),
      title: doc.title,
      description: doc.description || '',
      categoryId: doc.categoryId,
      subcategoryId: doc.subcategoryId || null,
      termId: doc.termId || null,
      storedName: doc.storedName,
      originalName: doc.originalName,
      size: doc.size,
      mimeType: doc.mimeType,
      uploadedBy: doc.uploadedBy,
      uploadedByName: doc.uploadedByName || '',
      createdAt: new Date().toISOString()
    };
    db.documents.push(record);
    save();
    return record;
  },
  update: (id, patch) => {
    const doc = db.documents.find((d) => d.id === id);
    if (!doc) return null;
    Object.assign(doc, patch);
    save();
    return doc;
  },
  remove: (id) => {
    const doc = db.documents.find((d) => d.id === id);
    if (!doc) return null;
    db.documents = db.documents.filter((d) => d.id !== id);
    save();
    return doc;
  }
};

module.exports = {
  DATA_DIR,
  DB_FILE,
  load,
  save,
  seed,
  slugify,
  users,
  categories,
  subcategories,
  terms,
  curricula,
  documents
};
