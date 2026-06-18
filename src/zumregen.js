'use strict';

/**
 * Zümre tutanağı Word (.docx) üreticisi.
 * Başlık + toplantı bilgileri + katılanlar + gündem maddeleri +
 * görüşülen kararlar + alınan kararlar + imza bloğu.
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, VerticalAlign
} = require('docx');

const FONT = 'Times New Roman';

function p(text, opts = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : (opts.right ? AlignmentType.RIGHT : AlignmentType.JUSTIFIED),
    spacing: { after: opts.after == null ? 80 : opts.after, line: 276 },
    children: String(text == null ? '' : text).split(/\r?\n/).map((line, i) =>
      new TextRun({ text: (i ? '\n' : '') + line, break: i ? 1 : 0, bold: !!opts.bold, size: opts.size || 22, font: FONT })
    )
  });
}

function heading(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 100 },
    children: [new TextRun({ text, bold: true, size: 22, font: FONT })]
  });
}

function noBorders() {
  const n = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return { top: n, bottom: n, left: n, right: n, insideHorizontal: n, insideVertical: n };
}

function signatureTable(signers) {
  const list = signers && signers.length ? signers : [];
  const rows = [];
  for (let i = 0; i < list.length; i += 2) {
    const pair = [list[i], list[i + 1]];
    rows.push(new TableRow({
      children: pair.map((s) =>
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: noBorders(),
          children: s
            ? [
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 0 }, children: [new TextRun({ text: s.name || '', bold: true, size: 20, font: FONT })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: s.role || '', size: 18, font: FONT })] })
              ]
            : [new Paragraph({ text: '' })]
        })
      )
    }));
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders(), rows });
}

function buildZumreDocument(z) {
  const children = [];

  // Baslik
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: ((z.term || '') + ' EĞİTİM ÖĞRETİM YILI').trim(), bold: true, size: 24, font: FONT })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: (z.school || '').toLocaleUpperCase('tr'), bold: true, size: 24, font: FONT })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: [z.area, z.meetingTitle].filter(Boolean).join(' ').toLocaleUpperCase('tr'), bold: true, size: 24, font: FONT })] }));

  // Toplanti bilgileri
  children.push(p('TOPLANTI NO: ' + (z.meetingNo || ''), { bold: true, after: 0 }));
  children.push(p('TOPLANTI TARİHİ VE SAATİ : ' + [z.date, z.time].filter(Boolean).join(' '), { bold: true, after: 0 }));
  children.push(p('TOPLANTI YERİ : ' + (z.place || ''), { bold: true, after: 0 }));
  children.push(p('TOPLANTIYA KATILANLAR :', { bold: true, after: 0 }));
  (z.attendees || []).forEach((a) => children.push(p(a, { after: 0, size: 20 })));

  // Gundem
  children.push(heading('GÜNDEM MADDELERİ'));
  (z.agenda || []).forEach((g, i) => children.push(p((i + 1) + '. ' + g, { after: 40 })));

  // Gorusmeler
  children.push(heading('GÜNDEM MADDELERİNİN GÖRÜŞÜLMESİ'));
  (z.discussions || []).forEach((d, i) => children.push(p((i + 1) + '- ' + d, { after: 80 })));

  // Alinan kararlar
  if (z.decisions && z.decisions.length) {
    children.push(heading('ALINAN KARARLAR'));
    z.decisions.forEach((k) => children.push(p('• ' + k, { after: 40 })));
  }

  // Imza
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 80 }, children: [new TextRun({ text: 'Zümre Öğretmenleri', bold: true, size: 22, font: FONT })] }));
  children.push(signatureTable(z.signers));
  children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 300, after: 0 }, children: [new TextRun({ text: 'OLUR', bold: true, size: 22, font: FONT })] }));
  children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [new TextRun({ text: z.date || '', size: 20, font: FONT })] }));
  children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [new TextRun({ text: (z.principalName || '').toLocaleUpperCase('tr'), bold: true, size: 20, font: FONT })] }));
  children.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: z.principalTitle || 'Okul Müdürü', size: 20, font: FONT })] }));

  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children }]
  });
}

async function generateZumreBuffer(z) {
  return Packer.toBuffer(buildZumreDocument(z));
}

module.exports = { generateZumreBuffer };
