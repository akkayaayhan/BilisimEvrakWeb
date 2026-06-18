'use strict';

/**
 * Yillik plan Word (.docx) ureticisi.
 * Bir mufredat (ders + uniteler/kazanimlar) ve baslik bilgilerinden
 * resmi tarzda bicimlenmis bir Word belgesi olusturur.
 *
 * Saf JavaScript "docx" kutuphanesi kullanir (Hostinger'da derleme gerektirmez).
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
  BorderStyle,
  PageOrientation,
  VerticalAlign
} = require('docx');

const COLS = [
  { key: 'month', title: 'AY', w: 7 },
  { key: 'week', title: 'HAFTA', w: 7 },
  { key: 'unit', title: 'ÜNİTE / TEMA', w: 14 },
  { key: 'topic', title: 'KONULAR', w: 16 },
  { key: 'objectives', title: 'KAZANIMLAR', w: 24 },
  { key: 'methods', title: 'YÖNTEM VE TEKNİKLER', w: 12 },
  { key: 'tools', title: 'ARAÇ - GEREÇ', w: 10 },
  { key: 'assessment', title: 'ÖLÇME - DEĞERLENDİRME', w: 10 }
];

function lines(text) {
  return String(text == null ? '' : text)
    .split(/\r?\n/)
    .map(
      (l) =>
        new Paragraph({
          children: [new TextRun({ text: l, size: 16 })],
          spacing: { after: 0 }
        })
    );
}

function headerCell(text, widthPct) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { fill: 'E5E7EB' },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, size: 16 })]
      })
    ]
  });
}

function bodyCell(text, widthPct, center) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    children: center
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: String(text == null ? '' : text), size: 16 })]
          })
        ]
      : lines(text)
  });
}

function infoRow(label, value) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 22, type: WidthType.PERCENTAGE },
        shading: { fill: 'F3F4F6' },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18 })] })]
      }),
      new TableCell({
        width: { size: 78, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: value || '', size: 18 })] })]
      })
    ]
  });
}

/**
 * @param {object} p
 * @param {object} p.curriculum - { name, gradeLevel, weeklyHours, rows: [...] }
 * @param {string} p.schoolName
 * @param {string} p.teacherName
 * @param {string} p.term - "2025-2026"
 * @param {string} p.className - "10-A"
 * @param {string} p.principalName
 */
function buildPlanDocument(p) {
  const cur = p.curriculum;
  const rows = cur.rows || [];

  const titleParas = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'T.C.', bold: true, size: 20 })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: (p.schoolName || '').toLocaleUpperCase('tr'), bold: true, size: 22 })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text:
            (p.term || '') +
            ' EĞİTİM-ÖĞRETİM YILI ' +
            (cur.name || '').toLocaleUpperCase('tr') +
            ' DERSİ ÜNİTELENDİRİLMİŞ YILLIK DERS PLANI',
          bold: true,
          size: 20
        })
      ]
    })
  ];

  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      infoRow('Okul', p.schoolName),
      infoRow('Ders', cur.name),
      infoRow('Sınıf / Şube', p.className),
      infoRow('Haftalık Ders Saati', cur.weeklyHours ? String(cur.weeklyHours) : ''),
      infoRow('Öğretmen', p.teacherName),
      infoRow('Öğretim Yılı', p.term)
    ]
  });

  const headerRow = new TableRow({
    tableHeader: true,
    children: COLS.map((c) => headerCell(c.title, c.w))
  });
  const dataRows = rows.map(
    (r) =>
      new TableRow({
        children: COLS.map((c) => bodyCell(r[c.key], c.w, c.key === 'month' || c.key === 'week'))
      })
  );

  const planTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows]
  });

  const signature = new Paragraph({
    spacing: { before: 300 },
    children: [
      new TextRun({ text: '\t\t\t\t\t\t' }),
      new TextRun({ text: (p.teacherName || '') + '\n', size: 18 }),
      new TextRun({ text: 'Bilişim Teknolojileri Öğretmeni', size: 16 })
    ]
  });
  const approve = new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 240 },
    children: [new TextRun({ text: 'Uygundur\n' + (p.principalName || '') + '\nOkul Müdürü', size: 18 })]
  });

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, bottom: 720, left: 720, right: 720 }
          }
        },
        children: [
          ...titleParas,
          infoTable,
          new Paragraph({ text: '', spacing: { after: 120 } }),
          planTable,
          signature,
          approve
        ]
      }
    ]
  });
}

async function generatePlanBuffer(params) {
  const doc = buildPlanDocument(params);
  return Packer.toBuffer(doc);
}

module.exports = { generatePlanBuffer };
