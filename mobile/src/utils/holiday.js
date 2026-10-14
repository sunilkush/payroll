import { listPayrollApi } from '../api/endpoints';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// NATIONAL: har saal usi tarikh (26 Jan, 15 Aug). FESTIVAL: tarikh badalti hai. COMPANY: company ki apni chhutti.
export const HOLIDAY_TYPES = [
  { value: 'NATIONAL', label: 'National' },
  { value: 'FESTIVAL', label: 'Festival' },
  { value: 'COMPANY', label: 'Company' },
];
export const holidayTypeLabel = (type) => HOLIDAY_TYPES.find((item) => item.value === type)?.label ?? 'Company';

// PUT /settings poori list badalti hai: har holiday ke saath type aur branchIds bhi bhejo, warna wo mit jate hain.
export const toHolidayPayload = ({ date, name, type, branchIds }) => ({ date, name, type: type ?? 'COMPANY', branchIds: branchIds ?? [] });

// 'all branches' ya 'Head Office, Mumbai'
export function branchesLabel(holiday, locations) {
  if (!holiday.branchIds?.length) return 'all branches';
  const names = holiday.branchIds.map((id) => locations.find((location) => String(location._id) === String(id))?.name).filter(Boolean);
  return names.length ? names.join(', ') : 'removed branch';
}

export const weekdayOf = (date) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
};
export const weekdayName = (date) => WEEKDAYS[weekdayOf(date)];
export const weekdayShort = (date) => WEEKDAYS[weekdayOf(date)].slice(0, 3);

// Aaj se kitne din baad: 0 = aaj
export function daysUntil(date) {
  const [year, month, day] = date.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

export const inDaysLabel = (date) => {
  const days = daysUntil(date);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
};

// Us mahine ki payroll lock (final) ho chuki hai? Tab holiday badalne se salary nahi badalti, isliye rokte hain.
export async function isMonthFinalized(month) {
  try {
    const { data } = await listPayrollApi(month);
    return data.rows.length > 0 && data.rows.every((row) => row.status === 'FINAL');
  } catch {
    return false; // payroll plan mein na ho ya network: server ka faisla hi chalega
  }
}
