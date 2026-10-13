// Server ki tarah app ka timezone bhi IST hai (attendance ki date wahi hoti hai).
const TIME_ZONE = 'Asia/Kolkata';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Date / ISO string -> '10:30 am'
export const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString('en-IN', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: true })
    : '--';

// '2026-10-05' -> '05 Oct 2026'
export const formatDate = (dateStr) =>
  dateStr ? `${dateStr.slice(8, 10)} ${MONTHS[Number(dateStr.slice(5, 7)) - 1]} ${dateStr.slice(0, 4)}` : '--';

// '2026-10' -> 'Oct 2026'
export const formatMonth = (month) => `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;

export const weekdayName = (index) => WEEKDAYS[index] ?? '';

// 135 -> '2h 15m'
export const formatMinutes = (minutes = 0) =>
  `${Math.floor(minutes / 60)}h ${String(Math.round(minutes % 60)).padStart(2, '0')}m`;

export const formatMoney = (amount = 0) => `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// IST ki aaj ki date: '2026-10-05'
export function todayStr() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export const currentMonth = () => todayStr().slice(0, 7);

// addMonths('2026-01', -1) -> '2025-12'
export const addMonths = (month, delta) =>
  new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + delta, 1)).toISOString().slice(0, 7);

// addDays('2026-10-01', 1) -> '2026-10-02'
export const addDays = (dateStr, days) =>
  new Date(Date.parse(`${dateStr}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

// 'YYYY-MM-DD' sahi format mein ho aur asli date ho (2026-02-30 jaisi nahi).
export const isValidDateStr = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
