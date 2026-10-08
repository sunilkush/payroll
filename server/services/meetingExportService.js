import ExcelJS from 'exceljs';
import { env } from '../config/env.js';

// Excel mein date / time app ke timezone mein, text ki tarah (Excel apna timezone na lagaye).
const dateFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: env.timezone, day: '2-digit', month: 'short', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('en-IN', { timeZone: env.timezone, hour: '2-digit', minute: '2-digit', hour12: true });
const date = (value) => (value ? dateFormatter.format(new Date(value)) : '');
const time = (value) => (value ? timeFormatter.format(new Date(value)) : '');

// 'FOLLOW_UP_REQUIRED' -> 'Follow Up Required'
const label = (value) =>
  value
    ? value
        .toLowerCase()
        .split('_')
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(' ')
    : '';
const yesNo = (value) => (value === true ? 'Yes' : value === false ? 'No' : '');

const COLUMNS = [
  { header: 'Date', width: 13, value: (m) => date(m.startAt) },
  { header: 'Meeting', width: 28, value: (m) => m.title },
  { header: 'Client', width: 28, value: (m) => m.clientId?.name },
  { header: 'Sales Manager', width: 22, value: (m) => m.salesManagerId?.name },
  { header: 'Emp Code', width: 11, value: (m) => m.salesManagerId?.employeeCode },
  { header: 'Scheduled Start', width: 15, value: (m) => time(m.startAt) },
  { header: 'Scheduled End', width: 14, value: (m) => time(m.endAt) },
  { header: 'Status', width: 13, value: (m) => label(m.status) },
  { header: 'Check-in', width: 11, value: (m) => time(m.checkIn?.at) },
  { header: 'Check-out', width: 11, value: (m) => time(m.checkOut?.at) },
  { header: 'Duration (min)', width: 14, number: true, value: (m) => m.durationMinutes },
  { header: 'Check-in Distance (m)', width: 20, number: true, value: (m) => m.checkIn?.distance },
  { header: 'Check-in Location', width: 18, value: (m) => label(m.checkIn?.locationStatus) },
  { header: 'Check-out Distance (m)', width: 21, number: true, value: (m) => m.checkOut?.distance },
  { header: 'Check-out Location', width: 19, value: (m) => label(m.checkOut?.locationStatus) },
  { header: 'Meeting Location', width: 28, value: (m) => m.location?.name },
  { header: 'Outcome', width: 20, value: (m) => label(m.result?.outcome) },
  { header: 'Client Interested', width: 16, value: (m) => yesNo(m.result?.clientInterested) },
  { header: 'Requirement', width: 30, value: (m) => m.result?.requirement },
  { header: 'Est. Deal Value', width: 16, money: true, value: (m) => m.result?.estimatedDealValue },
  { header: 'Remarks', width: 30, value: (m) => m.result?.remarks },
  { header: 'Follow-up Date', width: 15, value: (m) => date(m.followUp?.at) },
  { header: 'Follow-up Time', width: 14, value: (m) => time(m.followUp?.at) },
  { header: 'Follow-up Status', width: 16, value: (m) => label(m.followUp?.status) },
  { header: 'Follow-up Notes', width: 30, value: (m) => m.followUp?.notes },
  { header: 'Cancel Reason', width: 24, value: (m) => m.cancelReason },
];

// Meetings ko Excel (.xlsx) banakar output stream (response) mein likhta hai.
// Kaun si report hai, ye filters tay karte hain (jaise status = Missed, ya ek sales manager, ya ek mahina).
export async function writeMeetingExcel({ company, rows, from, to }, output) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Meetings');

  const period = from || to ? ` (${from ?? 'start'} to ${to ?? 'today'})` : '';
  sheet.addRow([`${company?.name ?? ''} - Sales Meetings${period}`]).font = { bold: true, size: 13 };
  sheet.addRow([]);
  sheet.addRow(COLUMNS.map((column) => column.header)).font = { bold: true };

  for (const meeting of rows) {
    sheet.addRow(COLUMNS.map((column) => column.value(meeting) ?? ''));
  }

  COLUMNS.forEach((column, index) => {
    const sheetColumn = sheet.getColumn(index + 1);
    sheetColumn.width = column.width;
    if (column.money) sheetColumn.numFmt = '#,##0.00';
  });
  sheet.views = [{ state: 'frozen', ySplit: 3 }];

  await workbook.xlsx.write(output);
}
