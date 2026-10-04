import ExcelJS from 'exceljs';
import { monthLabel } from '../utils/dateUtil.js';

const COLUMNS = [
  { header: 'Emp Code', width: 12, value: (p) => p.staff.employeeCode },
  { header: 'Name', width: 24, value: (p) => p.staff.name },
  { header: 'UAN', width: 16, value: (p) => p.staff.uan },
  { header: 'ESIC No', width: 16, value: (p) => p.staff.esicNo },
  { header: 'Payable Days', width: 13, value: (p) => p.payableDays },
  { header: 'LOP Days', width: 10, value: (p) => p.lopDays },
  { header: 'Monthly Gross', width: 14, money: true, value: (p) => p.salaryStructure.gross },
  { header: 'Basic', width: 12, money: true, value: (p) => p.earnings.basic },
  { header: 'HRA', width: 12, money: true, value: (p) => p.earnings.hra },
  { header: 'Special', width: 12, money: true, value: (p) => p.earnings.special },
  { header: 'Other', width: 12, money: true, value: (p) => p.earnings.other },
  { header: 'Earned Gross', width: 14, money: true, value: (p) => p.earnings.gross },
  { header: 'PF', width: 10, money: true, value: (p) => p.deductions.pf },
  { header: 'ESI', width: 10, money: true, value: (p) => p.deductions.esi },
  { header: 'Other Ded.', width: 12, money: true, value: (p) => p.deductions.other },
  { header: 'Total Ded.', width: 12, money: true, value: (p) => p.deductions.total },
  { header: 'Net Salary', width: 14, money: true, value: (p) => p.netSalary },
  { header: 'Employer EPF', width: 13, money: true, value: (p) => p.employerContribution.epf },
  { header: 'Employer EPS', width: 13, money: true, value: (p) => p.employerContribution.eps },
  { header: 'EDLI', width: 10, money: true, value: (p) => p.employerContribution.edli },
  { header: 'PF Admin', width: 10, money: true, value: (p) => p.employerContribution.pfAdmin },
  { header: 'Employer ESI', width: 13, money: true, value: (p) => p.employerContribution.esi },
  { header: 'Bank', width: 18, value: (p) => p.staff.bankName },
  { header: 'Account No', width: 20, value: (p) => p.staff.accountNo },
  { header: 'IFSC', width: 14, value: (p) => p.staff.ifsc },
  { header: 'Status', width: 10, value: (p) => p.status },
];

// Mahine ki payroll ko Excel (.xlsx) banakar output stream (response) mein likhta hai.
export async function writePayrollExcel({ month, rows, company }, output) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`Payroll ${month}`);

  sheet.addRow([`${company.name} - Payroll ${monthLabel(month)}`]).font = { bold: true, size: 13 };
  sheet.addRow([]);
  sheet.addRow(COLUMNS.map((column) => column.header)).font = { bold: true };

  for (const payroll of rows) {
    sheet.addRow(COLUMNS.map((column) => column.value(payroll) ?? ''));
  }

  // Totals: paise wale columns ka jod
  const totals = COLUMNS.map((column, index) => {
    if (index === 0) return 'TOTAL';
    if (!column.money) return '';
    return rows.reduce((total, payroll) => total + (column.value(payroll) ?? 0), 0);
  });
  sheet.addRow(totals).font = { bold: true };

  COLUMNS.forEach((column, index) => {
    const sheetColumn = sheet.getColumn(index + 1);
    sheetColumn.width = column.width;
    if (column.money) sheetColumn.numFmt = '#,##0.00';
  });

  await workbook.xlsx.write(output);
}
