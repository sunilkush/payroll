const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// '2026-09' -> 'September 2026'
export const periodLabel = (period) => `${MONTHS[Number(period.slice(5, 7)) - 1]} ${period.slice(0, 4)}`;

// Financial year April se: '2026-09' -> '2026-27', '2027-02' -> '2026-27'
export function financialYearOf(period) {
  const year = Number(period.slice(0, 4));
  const start = Number(period.slice(5, 7)) >= 4 ? year : year - 1;
  return `${start}–${String((start + 1) % 100).padStart(2, '0')}`;
}

// '123456789012' -> '••••9012'
export const maskTail = (value) => (value ? `••••${String(value).slice(-4)}` : '');

// Payable days kis ginti mein se (Global Settings ka payrollDaysBasis, aam taur par 30). Payroll mein alag se
// nahi rakha jata; payable + LOP wahi hota hai (poora mahina LOP ho tab chhod kar), warna 30.
export const daysBasisOf = (payroll) => (payroll.payableDays > 0 ? payroll.payableDays + payroll.lopDays : 30);

export const slipFilename = (payroll) =>
  `salary-slip-${String(payroll.staff?.employeeCode || 'staff').replace(/[^a-zA-Z0-9_-]/g, '-')}-${payroll.period}.pdf`;
