const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export const formatDate = (value) => (value ? dateFormatter.format(new Date(value)) : '-');

const monthFormatter = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });

// '2026-10' -> 'October 2026'
export const formatMonth = (month) => monthFormatter.format(new Date(`${month}-01T00:00:00`));

export const formatTime = (value) => (value ? timeFormatter.format(new Date(value)) : '-');

export const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);

// Monthly gross = salary structure ke saare components ka total.
export const grossSalary = (structure = {}) =>
  ['basic', 'hra', 'special', 'other'].reduce((sum, key) => sum + (Number(structure[key]) || 0), 0);

const shortDateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const compactCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

// '2026-10-05' -> '5 Oct' (charts ke axis ke liye)
export const formatShortDate = (value) => (value ? shortDateFormatter.format(new Date(value)) : '');

// 184500 -> '₹1.8L' (KPI aur chart axis ke liye)
export const formatCompactCurrency = (value) => compactCurrencyFormatter.format(Number(value) || 0);

// "5m ago", "3h ago", "Yesterday", warna date
export function timeAgo(value, now = new Date()) {
  const minutes = Math.round((now - new Date(value)) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h ago`;
  if (minutes < 48 * 60) return 'Yesterday';
  return formatShortDate(value);
}

// Din ke samay ke hisaab se: Good morning / afternoon / evening
export function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  return hour < 17 ? 'Good afternoon' : 'Good evening';
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// <input type="month"> ke liye current month, 'YYYY-MM' (local time).
export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
