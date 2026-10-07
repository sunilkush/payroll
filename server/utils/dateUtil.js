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

const zoneFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: env.timezone,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

// App timezone ki date + 'HH:mm' -> asli waqt. Asia/Kolkata mein zonedTime('2026-10-05', '09:30') -> 04:00 UTC
export function zonedTime(dateStr, time) {
  const asUtc = Date.parse(`${dateStr}T${time}:00Z`);
  const parts = Object.fromEntries(zoneFormatter.formatToParts(asUtc).map((part) => [part.type, part.value]));
  const shown = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return new Date(asUtc - (shown - asUtc));
}

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

// '2026-10' -> 'Oct' (charts ke axis ke liye)
export const shortMonthLabel = (month) => MONTH_NAMES[Number(month.slice(5)) - 1].slice(0, 3);

// Aakhri `count` mahine, purane se naye: lastMonths(3, '2026-10') -> ['2026-08', '2026-09', '2026-10']
export function lastMonths(count, month = currentMonth()) {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5)) - 1;
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.UTC(year, index - (count - 1 - i), 1)).toISOString().slice(0, 7)
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;
const toUtcMs = (dateStr) => Date.parse(`${dateStr}T00:00:00Z`);

// 'YYYY-MM-DD' sahi format mein ho aur asli date ho (2026-02-30 jaisi nahi).
export const isValidDateStr = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(toUtcMs(value)) &&
  new Date(toUtcMs(value)).toISOString().slice(0, 10) === value;

// addDays('2026-10-01', -1) -> '2026-09-30'
export const addDays = (dateStr, days) => new Date(toUtcMs(dateStr) + days * DAY_MS).toISOString().slice(0, 10);

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
