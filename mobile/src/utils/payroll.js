import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { currentMonth, shiftMonth } from './format';
import { periodLabel } from './salary';

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthName = (month) => periodLabel(month).split(' ')[0];

// Mahine ke din: '2026-09' -> 30
export const daysInMonth = (month) => new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();

// 'Attendance for 1–30 Sep'
export const monthRangeLabel = (month) => `1–${daysInMonth(month)} ${SHORT[Number(month.slice(5, 7)) - 1]}`;

// FY (April se) ke mahine, chalu mahine tak: fyStart 2026 -> ['2026-04', ..., abhi]
export function fyMonths(fyStart) {
  const last = currentMonth();
  const months = [];
  for (let month = `${fyStart}-04`; month <= last && month <= `${fyStart + 1}-03`; month = shiftMonth(month, 1)) months.push(month);
  return months;
}

export const fyStartOf = (month) => (Number(month.slice(5, 7)) >= 4 ? Number(month.slice(0, 4)) : Number(month.slice(0, 4)) - 1);

// Ek mahine ki haalat: OPEN (chalu mahina), TODO (khatam, payroll nahi), DRAFT, LOCKED (sab final)
export function monthState(month, data) {
  const rows = data?.rows ?? [];
  if (rows.length && rows.every((row) => row.status === 'FINAL')) return 'LOCKED';
  if (rows.length) return 'DRAFT';
  return month >= currentMonth() ? 'OPEN' : 'TODO';
}

export const lockedAtOf = (rows) => rows.reduce((latest, row) => (row.finalizedAt && row.finalizedAt > (latest ?? '') ? row.finalizedAt : latest), null);

// Other deduction ki hadd: earned gross − PF − ESI (net kabhi minus na ho). Server bhi isi se rokta hai.
export const otherCapOf = (row) => Math.max(0, Math.round((row.earnings.gross - row.deductions.pf - row.deductions.esi) * 100) / 100);

// Employee PF ka rate (12%): payroll mein rate save nahi hota, PF / wage se nikalta hai.
export const pfRateOf = (row) => (row.pfWage > 0 && row.deductions.pf > 0 ? Math.round((row.deductions.pf / row.pfWage) * 100) : null);

// Bank transfer ke liye CSV (naam, code, account, IFSC, bank, rakam). Jinke bank details nahi, wo chhoot jate hain.
// Return: { skipped: [naam] }
export async function shareBankSheet(month, rows) {
  const ready = rows.filter((row) => row.staff?.accountNo && row.staff?.ifsc && row.netSalary > 0);
  const skipped = rows.filter((row) => !ready.includes(row) && row.netSalary > 0).map((row) => row.staff?.name ?? 'Staff');
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [
    ['Name', 'Employee code', 'Account number', 'IFSC', 'Bank', 'Amount'].map(escape).join(','),
    ...ready.map((row) => [row.staff.name, row.staff.employeeCode, row.staff.accountNo, row.staff.ifsc, row.staff.bankName, row.netSalary.toFixed(2)].map(escape).join(',')),
  ];
  const file = new File(Paths.cache, `bank-transfer-${month}.csv`);
  if (file.exists) file.delete();
  file.create();
  file.write(lines.join('\n'));
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: `Bank transfer, ${periodLabel(month)}`, UTI: 'public.comma-separated-values-text' });
  return { skipped };
}
