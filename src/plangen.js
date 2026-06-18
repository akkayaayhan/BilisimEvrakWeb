'use strict';

/**
 * Yillik plan Word (.docx) ureticisi.
 * MEB unitelendirilmis yillik ders plani formatina gore uretim yapar:
 * 2 satirlik baslik + (Ay/Hafta/Saat/Kazanim/Konu/Ogretim Teknikleri/Arac-Gerec/Aciklama)
 * tablosu + ara tatil bantlari + alt notlar + imza bolumu.
 */

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  PageOrientation,
  VerticalAlign,
  BorderStyle
} = require('docx');

const COLS = [
  { key: 'month', title: 'Ay', w: 6, center: true },
  { key: 'week', title: 'Hafta', w: 8, center: true },
  { key: 'hours', title: 'Saat', w: 5, center: true },
  { key: 'objectives', title: 'Kazanım', w: 21 },
  { key: 'topic', title: 'Konu', w: 24 },
  { key: 'methods', title: 'Öğretim Teknikleri', w: 13 },
  { key: 'tools', title: 'Araç - Gereç', w: 12 },
  { key: 'notes', title: 'Açıklama', w: 11, center: true }
];

const FONT = 'Times New Roman';

function runs(text, opts = {}) {
  return String(text == null ? '' : text)
    .split(/\r?\n/)
    .map(
      (l) =>
        new Paragraph({
          alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { after: 0, line: 240 },
          children: [new TextRun({ text: l, size: opts.size || 16, bold: !!opts.bold, font: FONT })]
        })
    );
}

function headerCell(text, w) {
  return new TableCell({
    width: { size: w, type: WidthType.PERCENTAGE },
    shading: { fill: 'D9D9D9' },
    verticalAlign: VerticalAlign.CENTER,
    children: runs(text, { bold: true, center: true, size: 16 })
  });
}

function bodyCell(text, w, center) {
  return new TableCell({
    width: { size: w, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    children: runs(text, { center, size: 16 })
  });
}

function bannerRow(text) {
  return new TableRow({
    children: [
      new TableCell({
        columnSpan: COLS.length,
        shading: { fill: 'F2F2F2' },
        verticalAlign: VerticalAlign.CENTER,
        children: runs(text, { bold: true, center: true, size: 18 })
      })
    ]
  });
}

function centerPara(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: opts.spacing || { after: 40 },
    children: [new TextRun({ text, bold: !!opts.bold, size: opts.size || 20, font: FONT })]
  });
}

function noBorderCell(children, w) {
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return new TableCell({
    width: { size: w, type: WidthType.PERCENTAGE },
    borders: { top: none, bottom: none, left: none, right: none },
    children
  });
}

function signatureTable(teachers) {
  const list = teachers && teachers.length ? teachers : ['Ders Öğretmeni'];
  const w = Math.floor(100 / list.length);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }
    },
    rows: [
      new TableRow({
        children: list.map((t) =>
          noBorderCell(
            [
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240 }, children: [new TextRun({ text: t, bold: true, size: 18, font: FONT })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Ders Öğretmeni', size: 16, font: FONT })] })
            ],
            w
          )
        )
      })
    ]
  });
}

function buildPlanDocument(p) {
  const rows = p.rows || [];
  const defMethods = p.defaultMethods || '';
  const defTools = p.defaultTools || '';

  const headLine1 = [p.term, 'EĞİTİM-ÖĞRETİM YILI', p.province ? p.province + ' İLİ' : '', p.district ? p.district + ' İLÇESİ' : '', p.school || '']
    .filter(Boolean).join(' ').toLocaleUpperCase('tr');
  const headLine2 = [p.area || '', p.gradeLevel || '', p.courseName || '', 'DERSİ ÜNİTELENDİRİLMİŞ YILLIK DERS PLANI']
    .filter(Boolean).join(' ').toLocaleUpperCase('tr');

  const headerRow = new TableRow({
    tableHeader: true,
    children: COLS.map((c) => headerCell(c.title, c.w))
  });

  const dataRows = rows.map((r) => {
    if (r.banner) return bannerRow(r.banner);
    return new TableRow({
      children: COLS.map((c) => {
        let v = r[c.key];
        if (c.key === 'methods' && !v) v = defMethods;
        if (c.key === 'tools' && !v) v = defTools;
        return bodyCell(v, c.w, c.center);
      })
    });
  });

  const planTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows]
  });

  const note1 = 'Bu plan Mesleki ve Teknik Eğitim Genel Müdürlüğü ile Talim Terbiye Kurulunun yayınladığı Çerçeve Öğretim Programı ve Ders Bilgi Formlarına göre hazırlanmıştır.';
  const note2 = 'Atatürkçülük konuları ile ilgili olarak Talim ve Terbiye Kurulu Başkanlığının 2104 ve 2488 sayılı Tebliğler Dergisinden yararlanılmıştır.';

  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 16 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 567, bottom: 567, left: 567, right: 567 }
          }
        },
        children: [
          centerPara(headLine1, { bold: true, size: 20 }),
          centerPara(headLine2, { bold: true, size: 20, spacing: { after: 160 } }),
          planTable,
          new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: note1, size: 14, font: FONT })] }),
          new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: note2, size: 14, font: FONT })] }),
          signatureTable(p.signTeachers),
          centerPara('..../..../....', { spacing: { before: 240 } }),
          centerPara('Uygundur', { size: 18 }),
          centerPara(p.principalName || '', { bold: true, size: 18 }),
          centerPara('Okul Müdürü', { size: 16 })
        ]
      }
    ]
  });
}

async function generatePlanBuffer(params) {
  return Packer.toBuffer(buildPlanDocument(params));
}

module.exports = { generatePlanBuffer };
