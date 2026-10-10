import ExcelJS from 'exceljs';
import { monthLabel } from '../utils/dateUtil.js';

const COLUMNS = [
  { header: 'Emp Code', width: 14, value: (r) => r.staff?.employeeCode || '-' },
  { header: 'Employee Name', width: 24, value: (r) => r.staff?.name || '-' },
  { header: 'Department', width: 18, value: (r) => r.staff?.department || '-' },
  { header: 'Designation', width: 20, value: (r) => r.staff?.designation || '-' },
  { header: 'Present Days', width: 14, value: (r) => r.summary?.present || 0 },
  { header: 'Half Days', width: 12, value: (r) => r.summary?.halfDay || 0 },
  { header: 'Approved Leave', width: 15, value: (r) => r.summary?.leave || 0 },
  { header: 'Paid Holiday', width: 14, value: (r) => r.summary?.holiday || 0 },
  { header: 'Weekly Off', width: 12, value: (r) => r.summary?.weekOff || 0 },
  { header: 'Absent / LOP', width: 14, value: (r) => r.summary?.absent || 0 },
  { header: 'Late Punches', width: 13, value: (r) => r.summary?.late || 0 },
  { header: 'Total Payable Days', width: 18, value: (r) => r.summary?.payableDays || 0 },
];

export async function writeAttendanceExcel({ month, rows, company }, output) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`Attendance ${month}`);

  sheet.addRow([`${company?.name || 'PayRoster'} - Attendance Report ${monthLabel(month)}`]).font = {
    bold: true,
    size: 13,
  };
  sheet.addRow([]);
  sheet.addRow(COLUMNS.map((column) => column.header)).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(COLUMNS.map((column) => column.value(row) ?? ''));
  }

  COLUMNS.forEach((column, index) => {
    const sheetColumn = sheet.getColumn(index + 1);
    sheetColumn.width = column.width;
  });

  await workbook.xlsx.write(output);
}
