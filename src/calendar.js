'use strict';

/**
 * Yil uyarlama: bir dersin icerik satirlarini (kazanim/konu sirasi) hedef
 * ogretim yilinin calisma takvimine gore yeniden tarihler.
 * - Hafta tarihlerini (Pzt-Cuma) hesaplar
 * - Ara tatil / yariyil bantlarini dogru yerlere koyar
 * - Belirli gunleri (sabit tarihli) denk geldigi haftaya yerlestirir
 */

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function d(str) {
  const [y, m, day] = str.split('-').map(Number);
  return new Date(y, m - 1, day);
}
function key(dt) {
  return dt.getFullYear() * 10000 + (dt.getMonth() + 1) * 100 + dt.getDate();
}
function addDays(dt, n) {
  const x = new Date(dt);
  x.setDate(x.getDate() + n);
  return x;
}
function monthName(dt) {
  return MONTHS[dt.getMonth()];
}

// "14-18 Eylül" veya ay degisiyorsa "28 Eylül-2 Ekim"
function weekLabel(mon, fri) {
  if (mon.getMonth() === fri.getMonth()) {
    return mon.getDate() + '-' + fri.getDate() + ' ' + monthName(mon);
  }
  return mon.getDate() + ' ' + monthName(mon) + '-' + fri.getDate() + ' ' + monthName(fri);
}

// Belirli gun ifadelerini notlardan ayikla (tarihe gore yeniden yerlestirilecek)
const NATIONAL_PATTERNS = [
  'Cumhuriyet Bayramı', 'Atatürk\'ü Anma', 'Atatürk Haftası', 'Çanakkale', 'Ulusal Egemenlik',
  'Çocuk Bayramı', 'Gençlik ve Spor', 'Demokrasi', 'Millî Birlik', 'Anma Günü', 'Anma,'
];
function stripNational(notes) {
  return String(notes || '')
    .split(/\r?\n/)
    .filter((line) => line.trim() && !NATIONAL_PATTERNS.some((p) => line.includes(p)))
    .join('\n');
}

/**
 * @param {Array} contentRows - mufredat satirlari (banner'lar dahil; banner'lar ayiklanir)
 * @param {object} cal - takvim tanimi
 */
function adaptRows(contentRows, cal) {
  const content = contentRows
    .filter((r) => !r.banner)
    .map((r) => ({
      hours: r.hours || '',
      objectives: r.objectives || '',
      topic: r.topic || '',
      methods: r.methods || '',
      tools: r.tools || '',
      notes: stripNational(r.notes)
    }));

  const breaks = (cal.breaks || []).map((b) => ({ from: key(d(b.from)), to: key(d(b.to)), label: b.label }));
  const specials = (cal.specialDays || []).map((s) => ({ k: key(d(s.date)), note: s.note }));

  const out = [];
  let mon = d(cal.startDate);
  const endKey = key(d(cal.endDate));
  const doneBreaks = new Set();
  let ci = 0;
  let guard = 0;

  while (ci < content.length && guard < 80) {
    guard++;
    const fri = addDays(mon, 4);
    const sun = addDays(mon, 6);
    const mk = key(mon);

    // Yil sonu gecildiyse yeni hafta acma (kalan icerik son haftaya eklenir)
    if (mk > endKey) break;

    // Bu hafta bir tatile mi denk geliyor?
    const brk = breaks.find((b) => mk >= b.from && mk <= b.to);
    if (brk) {
      if (!doneBreaks.has(brk.label)) {
        out.push({ banner: brk.label });
        doneBreaks.add(brk.label);
      }
      mon = addDays(mon, 7);
      continue;
    }

    // Ogretim haftasi -> siradaki icerik
    const row = content[ci];
    const nd = specials.filter((s) => s.k >= key(mon) && s.k <= key(sun)).map((s) => s.note);
    const firstExtra = ci === 0 && cal.firstWeekNotes ? cal.firstWeekNotes : [];
    const notes = [row.notes, ...firstExtra, ...nd].filter(Boolean).join('\n');

    out.push({
      month: monthName(mon).toLocaleUpperCase('tr'),
      week: weekLabel(mon, fri),
      hours: row.hours,
      objectives: row.objectives,
      topic: row.topic,
      methods: row.methods,
      tools: row.tools,
      notes
    });
    ci++;
    mon = addDays(mon, 7);
  }

  // Yil sonuna sigmayan icerik kaldiysa son ogretim haftasina birlestir
  if (ci < content.length) {
    const last = [...out].reverse().find((r) => !r.banner);
    if (last) {
      for (; ci < content.length; ci++) {
        const r = content[ci];
        if (r.topic) last.topic = [last.topic, r.topic].filter(Boolean).join('\n');
        if (r.objectives && !last.objectives.includes(r.objectives)) {
          last.objectives = [last.objectives, r.objectives].filter(Boolean).join('\n');
        }
        if (r.notes) last.notes = [last.notes, r.notes].filter(Boolean).join('\n');
      }
    }
  }
  return out;
}

const CALENDARS = {
  '2026-2027': {
    term: '2026-2027',
    startDate: '2026-09-14',
    endDate: '2027-06-25',
    firstWeekNotes: ['15 Temmuz Demokrasi ve Millî Birlik Günü'],
    breaks: [
      { from: '2026-11-16', to: '2026-11-20', label: 'ARA TATİL (16-20 KASIM)' },
      { from: '2027-01-25', to: '2027-02-06', label: '2026-2027 EĞİTİM-ÖĞRETİM YILI YARIYIL TATİLİ' },
      { from: '2027-03-08', to: '2027-03-12', label: 'ARA TATİL (8-12 MART)' }
    ],
    specialDays: [
      { date: '2026-10-29', note: '29 Ekim Cumhuriyet Bayramı' },
      { date: '2026-11-10', note: '10 Kasım Atatürk\'ü Anma Günü ve Atatürk Haftası' },
      { date: '2027-03-18', note: '18 Mart Çanakkale Zaferi ve Şehitler Günü' },
      { date: '2027-04-23', note: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı' },
      { date: '2027-05-19', note: '19 Mayıs Atatürk\'ü Anma, Gençlik ve Spor Bayramı' }
    ]
  }
};

module.exports = { CALENDARS, adaptRows };
