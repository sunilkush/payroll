import PDFDocument from 'pdfkit';
import { toDateStr } from '../utils/dateUtil.js';

const PAGE_MARGIN = 40;
const COLOR = { text: '#111827', muted: '#6b7280', line: '#d1d5db', fill: '#f3f4f6' };

// PDF ke standard fonts mein rupee ka sign nahi hota, isliye "Rs." likhte hain.
const money = (value) =>
  `Rs. ${Number(value ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const text = (value) => (value === undefined || value === null || value === '' ? '-' : String(value));

// GST tax invoice ka PDF banakar output stream (response) mein likhta hai.
export function writeInvoicePdf(invoice, output) {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
  doc.pipe(output);

  const left = PAGE_MARGIN;
  const width = doc.page.width - PAGE_MARGIN * 2;
  const half = width / 2;
  const right = left + width;

  // ---- Header
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLOR.text).text('TAX INVOICE', { align: 'center' });
  doc.moveDown(0.8);

  // Ek party (bechne wala / kharidne wala) ka dabba
  const party = (title, who, x, y) => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.muted).text(title, x, y, { width: half - 12 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR.text).text(text(who.name), { width: half - 12 });
    doc.font('Helvetica').fontSize(9).fillColor(COLOR.text);
    if (who.address) doc.text(who.address, { width: half - 12 });
    doc.text(`GSTIN: ${text(who.gstin)}`, { width: half - 12 });
    doc.text(`State: ${text(who.state)}`, { width: half - 12 });
    return doc.y;
  };
  const top = doc.y;
  const sellerEnd = party('SOLD BY', invoice.seller, left, top);
  const buyerEnd = party('BILLED TO', invoice.buyer, left + half, top);
  let y = Math.max(sellerEnd, buyerEnd) + 12;

  // ---- Invoice ki jaankari
  doc.moveTo(left, y).lineTo(right, y).strokeColor(COLOR.line).stroke();
  y += 8;
  const meta = [
    ['Invoice No', invoice.number],
    ['Invoice Date', toDateStr(invoice.date)],
    ['Service Period', invoice.periodFrom && invoice.periodTo ? `${toDateStr(invoice.periodFrom)} to ${toDateStr(invoice.periodTo)}` : '-'],
    ['Payment Ref', text(invoice.razorpayPaymentId)],
  ];
  for (const [label, value] of meta) {
    doc.font('Helvetica').fontSize(9).fillColor(COLOR.muted).text(label, left, y, { width: 110 });
    doc.fillColor(COLOR.text).text(value, left + 110, y, { width: width - 110 });
    y += 15;
  }
  y += 8;

  // ---- Item
  const amountWidth = 110;
  const sacWidth = 70;
  doc.rect(left, y, width, 20).fill(COLOR.fill);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.text);
  doc.text('Description', left + 8, y + 6);
  doc.text('SAC', right - amountWidth - sacWidth, y + 6, { width: sacWidth });
  doc.text('Amount', right - amountWidth, y + 6, { width: amountWidth - 8, align: 'right' });
  y += 28;
  doc.font('Helvetica').fontSize(9);
  const descriptionWidth = width - amountWidth - sacWidth - 16;
  const descriptionHeight = doc.heightOfString(invoice.description, { width: descriptionWidth });
  doc.text(invoice.description, left + 8, y, { width: descriptionWidth });
  doc.text(text(invoice.sac), right - amountWidth - sacWidth, y, { width: sacWidth });
  doc.text(money(invoice.taxable), right - amountWidth, y, { width: amountWidth - 8, align: 'right' });
  y += descriptionHeight + 10;
  doc.moveTo(left, y).lineTo(right, y).strokeColor(COLOR.line).stroke();
  y += 8;

  // ---- Totals: sirf wahi tax jo laga hai (CGST + SGST ya IGST)
  const rate = invoice.gstPercent;
  const totals = [
    ['Taxable value', invoice.taxable],
    ...(invoice.igst ? [[`IGST @ ${rate}%`, invoice.igst]] : [[`CGST @ ${rate / 2}%`, invoice.cgst], [`SGST @ ${rate / 2}%`, invoice.sgst]]),
  ];
  for (const [label, value] of totals) {
    doc.font('Helvetica').fontSize(9).fillColor(COLOR.muted).text(label, left + half, y, { width: half - amountWidth });
    doc.fillColor(COLOR.text).text(money(value), right - amountWidth, y, { width: amountWidth - 8, align: 'right' });
    y += 15;
  }
  doc.rect(left + half, y, half, 22).fill(COLOR.fill);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.text);
  doc.text('Total', left + half + 8, y + 6);
  doc.text(money(invoice.total), right - amountWidth, y + 6, { width: amountWidth - 8, align: 'right' });
  y += 40;

  doc.font('Helvetica').fontSize(8).fillColor(COLOR.muted).text('This is a computer generated invoice and does not need a signature.', left, y, { width, align: 'center' });

  doc.end();
}
