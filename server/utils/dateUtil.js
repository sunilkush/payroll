import { env } from '../config/env.js';

// Attendance ki date 'YYYY-MM-DD' string hoti hai, app ke timezone (APP_TIMEZONE) ke hisaab se.
// String compare seedha kaam karta hai ('2026-04-01' < '2026-04-15').
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: env.timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const toDateStr = (date) => dateFormatter.format(date);

export const todayStr = () => toDateStr(new Date());

export const currentMonth = () => todayStr().slice(0, 7);

// month: 'YYYY-MM' -> us mahine ki saari dates
export function daysOfMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// '2026-10' -> 'October 2026'
export const monthLabel = (month) => `${MONTH_NAMES[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`;

const DAY_MS = 24 * 60 * 60 * 1000;
const toUtcMs = (dateStr) => Date.parse(`${dateStr}T00:00:00Z`);

// 'YYYY-MM-DD' sahi format mein ho aur asli date ho (2026-02-30 jaisi nahi).
export const isValidDateStr = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(toUtcMs(value)) &&
  new Date(toUtcMs(value)).toISOString().slice(0, 10) === value;

// from se to tak ki saari dates (dono shamil).
export function datesBetween(from, to) {
  const dates = [];
  for (let ms = toUtcMs(from); ms <= toUtcMs(to); ms += DAY_MS) {
    dates.push(new Date(ms).toISOString().slice(0, 10));
  }
  return dates;
}

// 0 = Sunday ... 6 = Saturday
export const weekdayOf = (dateStr) => new Date(`${dateStr}T00:00:00Z`).getUTCDay();
