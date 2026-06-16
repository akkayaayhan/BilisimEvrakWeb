'use strict';

const bcrypt = require('bcryptjs');

/** Duz metin sifreyi guvenli sekilde hashler. */
function hashPassword(plain) {
  return bcrypt.hashSync(String(plain), 10);
}

/** Girilen sifreyi hash ile karsilastirir. */
function verifyPassword(plain, hash) {
  try {
    return bcrypt.compareSync(String(plain), hash);
  } catch {
    return false;
  }
}

/** Giris yapilmis mi kontrol eder; yapilmamissa login'e yonlendirir. */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  // Giris sonrasi geri donmek icin hedef adresi sakla
  if (req.method === 'GET') {
    req.session.returnTo = req.originalUrl;
  }
  return res.redirect('/giris');
}

/** Sadece yoneticilerin (admin) erisebilecegi sayfalar icin. */
function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).render('error', {
    title: 'Yetkisiz',
    message: 'Bu sayfaya erisim yetkiniz yok. Sadece yoneticiler gorebilir.'
  });
}

module.exports = {
  hashPassword,
  verifyPassword,
  requireAuth,
  requireAdmin
};
