const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (value) => String(value).padStart(2, '0');

// Indian ginti (lakh / crore): 161842 -> '1,61,842'
const wholeFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const paiseFormatter = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// 161842 -> '₹1,61,842'; paise hon tabhi dikhte hain (1250.5 -> '₹1,250.50')
export function formatMoney(value) {
  const amount = Number(value) || 0;
  const formatter = Number.isInteger(amount) ? wholeFormatter : paiseFormatter;
  return `${amount < 0 ? '-' : ''}₹${formatter.format(Math.abs(amount))}`;
}

export const formatCount = (value) => wholeFormatter.format(Number(value) || 0);

// Server ka time (ISO) -> '09:27' (24 ghante, phone ke timezone mein)
export function formatTime(value) {
  if (!value) return '--:--';
  const date = new Date(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// 'YYYY-MM-DD' ko local din maante hain (UTC nahi), warna din khisak jata hai.
function toDate(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

// ISO ya 'YYYY-MM-DD' -> '14 Oct'
export function formatDate(value) {
  if (!value) return '-';
  const date = toDate(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function formatDateWithYear(value) {
  if (!value) return '-';
  return `${formatDate(value)} ${toDate(value).getFullYear()}`;
}

// 'Tue, 14 Oct'
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function formatDayDate(value) {
  if (!value) return '-';
  return `${WEEKDAYS_SHORT[toDate(value).getDay()]}, ${formatDate(value)}`;
}

// ---------- 'YYYY-MM-DD' / 'YYYY-MM' (phone ke local din se) ----------

export const todayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const currentMonth = () => todayStr().slice(0, 7);

// shiftMonth('2026-01', -1) -> '2025-12'
export function shiftMonth(month, by) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + by, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

// '2026-10' -> 'Oct 2026'
export const formatMonth = (month) => `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;

// 510 (minute) -> '8h 30m'
export function formatDuration(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  return `${Math.floor(total / 60)}h ${pad(total % 60)}m`;
}
