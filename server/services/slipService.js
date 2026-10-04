import PDFDocument from 'pdfkit';
import { PAYROLL_STATUS } from '../utils/constants.js';
import { monthLabel, toDateStr } from '../utils/dateUtil.js';

const PAGE_MARGIN = 40;
const COLOR = { text: '#111827', muted: '#6b7280', line: '#d1d5db', fill: '#f3f4f6', danger: '#dc2626' };

// PDF ke standard fonts mein rupee ka sign nahi hota, isliye "Rs." likhte hain.
const money = (value) =>
  `Rs. ${Number(value ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const text = (value) => (value === undefined || value === null || value === '' ? '-' : String(value));

// Salary slip ka PDF banakar output stream (response) mein likhta hai.
export function writeSlipPdf({ payroll, company }, output) {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
  doc.pipe(output);

  const left = PAGE_MARGIN;
  const width = doc.page.width - PAGE_MARGIN * 2;
  const half = width / 2;

  // label: value ki ek line, diye gaye column mein
  const pair = (label, value, x, y, columnWidth = half) => {
    doc.font('Helvetica').fontSize(9).fillColor(COLOR.muted).text(label, x + 8, y, { width: columnWidth * 0.45 });
    doc.fillColor(COLOR.text).text(value, x + columnWidth * 0.45, y, { width: columnWidth * 0.55 - 8, align: 'right' });
  };
  const sectionTitle = (title, x, y, columnWidth = width) => {
    doc.rect(x, y, columnWidth, 20).fill(COLOR.fill);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.text).text(title, x + 8, y + 6);
    return y + 26;
  };
  // Do column wali list (left aur right ki lines saath-saath)
  const twoColumns = (leftRows, rightRows, startY) => {
    const count = Math.max(leftRows.length, rightRows.length);
    for (let i = 0; i < count; i += 1) {
      const y = startY + i * 16;
      if (leftRows[i]) pair(leftRows[i][0], leftRows[i][1], left, y);
      if (rightRows[i]) pair(rightRows[i][0], rightRows[i][1], left + half, y);
    }
    return startY + count * 16 + 8;
  };

  // ---- Header
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLOR.text).text(company.name, { align: 'center' });
  if (company.address) doc.font('Helvetica').fontSize(9).fillColor(COLOR.muted).text(company.address, { align: 'center' });
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLOR.text).text(`Salary Slip - ${monthLabel(payroll.period)}`, { align: 'center' });
  if (payroll.status === PAYROLL_STATUS.DRAFT) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.danger).text('DRAFT - NOT FINAL', { align: 'center' });
  }
  doc.moveDown(0.8);

  // ---- Employee
  const { staff, attendance, earnings, deductions, employerContribution } = payroll;
  let y = sectionTitle('Employee Details', left, doc.y);
  y = twoColumns(
    [
      ['Name', text(staff.name)],
      ['Employee Code', text(staff.employeeCode)],
      ['Joining Date', staff.joiningDate ? toDateStr(staff.joiningDate) : '-'],
      ['UAN', text(staff.uan)],
    ],
    [
      ['ESIC No', text(staff.esicNo)],
      ['Bank', text(staff.bankName)],
      ['Account No', text(staff.accountNo)],
      ['IFSC', text(staff.ifsc)],
    ],
    y
  );

  // ---- Attendance
  y = sectionTitle('Attendance (30 days basis)', left, y);
  y = twoColumns(
    [
      ['Payable Days', text(payroll.payableDays)],
      ['LOP Days', text(payroll.lopDays)],
      ['Present', text(attendance.present)],
    ],
    [
      ['Paid Leave', text(attendance.leave)],
      ['Week Off', text(attendance.weekOff)],
      ['Holiday', text(attendance.holiday)],
    ],
    y
  );

  // ---- Earnings | Deductions
  sectionTitle('Earnings', left, y, half - 4);
  const afterTitles = sectionTitle('Deductions', left + half + 4, y, half - 4);
  y = twoColumns(
    [
      ['Basic', money(earnings.basic)],
      ['HRA', money(earnings.hra)],
      ['Special Allowance', money(earnings.special)],
      ['Other', money(earnings.other)],
    ],
    [
      ['PF (Employee)', money(deductions.pf)],
      ['ESI (Employee)', money(deductions.esi)],
      ['Other Deductions', money(deductions.other)],
    ],
    afterTitles
  );
  doc.moveTo(left, y).lineTo(left + width, y).strokeColor(COLOR.line).stroke();
  y += 6;
  doc.font('Helvetica-Bold');
  pair('Gross Earned', money(earnings.gross), left, y);
  pair('Total Deductions', money(deductions.total), left + half, y);
  y += 26;

  // ---- Net
  doc.rect(left, y, width, 30).fill(COLOR.fill);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLOR.text).text('Net Salary', left + 8, y + 9);
  doc.text(money(payroll.netSalary), left, y + 9, { width: width - 8, align: 'right' });
  y += 44;

  if (payroll.remarks) {
    doc.font('Helvetica').fontSize(9).fillColor(COLOR.muted).text(`Remarks: ${payroll.remarks}`, left, y, { width });
    y = doc.y + 10;
  }

  // ---- Employer contributions (sirf jaankari ke liye)
  if (employerContribution.total > 0) {
    y = sectionTitle('Employer Contributions (not deducted from salary)', left, y);
    y = twoColumns(
      [
        ['EPF', money(employerContribution.epf)],
        ['EPS', money(employerContribution.eps)],
        ['ESI', money(employerContribution.esi)],
      ],
      [
        ['EDLI', money(employerContribution.edli)],
        ['PF Admin Charges', money(employerContribution.pfAdmin)],
      ],
      y
    );
  }

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(COLOR.muted)
    .text('This is a computer generated salary slip and does not require a signature.', left, y + 16, {
      width,
      align: 'center',
    });

  doc.end();
}
