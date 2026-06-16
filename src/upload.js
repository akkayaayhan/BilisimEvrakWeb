'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

// Yuklenen dosyalarin klasoru. Deploy'da silinmemesi icin UPLOADS_DIR
// ortam degiskeni ile uygulama klasorunun DISINDA bir yer gosterilebilir.
const UPLOAD_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', 'uploads');

console.log('[config] UPLOADS_DIR (dosya klasoru) =', UPLOAD_DIR);
console.log('[config] UPLOADS_DIR env degeri       =', process.env.UPLOADS_DIR || '(BOS - okunmadi!)');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Izin verilen dosya turleri (yaygin evrak formatlari)
const ALLOWED_EXT = new Set([
  '.pdf',
  '.doc', '.docx',
  '.xls', '.xlsx',
  '.ppt', '.pptx',
  '.txt', '.rtf',
  '.odt', '.ods', '.odp',
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.zip', '.rar', '.7z'
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Cakismayi onlemek icin benzersiz ad uret, orijinal uzantiyi koru
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomUUID() + ext;
    cb(null, unique);
  }
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXT.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Bu dosya turune izin verilmiyor: ' + ext));
  }
}

const maxMb = parseInt(process.env.MAX_UPLOAD_MB || '50', 10);

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxMb * 1024 * 1024 }
});

module.exports = { upload, UPLOAD_DIR, ALLOWED_EXT };
