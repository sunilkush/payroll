const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});
const monthFormatter = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });
const shortDateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const compactCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const formatDate = (value) => {
  if (!value) return '-';
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return String(value);
  }
};

export const formatMonth = (month) => {
  if (!month) return '-';
  try {
    return monthFormatter.format(new Date(`${month}-01T00:00:00`));
  } catch {
    return month;
  }
};

export const monthLabel = (val) => {
  if (!val) return '';
  if (val instanceof Date) {
    try {
      return monthFormatter.format(val);
    } catch {
      return '';
    }
  }
  if (typeof val === 'string' && val.length === 7) {
    return formatMonth(val);
  }
  try {
    return monthFormatter.format(new Date(val));
  } catch {
    return String(val);
  }
};

export const formatTime = (value) => {
  if (!value) return '-';
  try {
    return timeFormatter.format(new Date(value));
  } catch {
    return String(value);
  }
};

export const formatCurrency = (value) => {
  try {
    return currencyFormatter.format(Number(value) || 0);
  } catch {
    return `₹${Number(value) || 0}`;
  }
};

export const grossSalary = (structure = {}) =>
  ['basic', 'hra', 'special', 'other'].reduce((sum, key) => sum + (Number(structure[key]) || 0), 0);

export const formatShortDate = (value) => {
  if (!value) return '';
  try {
    return shortDateFormatter.format(new Date(value));
  } catch {
    return String(value);
  }
};

export const formatCompactCurrency = (value) => {
  try {
    return compactCurrencyFormatter.format(Number(value) || 0);
  } catch {
    return `₹${Number(value) || 0}`;
  }
};

export function timeAgo(value, now = new Date()) {
  if (!value) return '';
  const minutes = Math.round((now - new Date(value)) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h ago`;
  if (minutes < 48 * 60) return 'Yesterday';
  return formatShortDate(value);
}

export function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  return hour < 17 ? 'Good afternoon' : 'Good evening';
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const fromMinutes = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export const addMinutes = (time, minutes) => fromMinutes(Math.min(toMinutes(time) + minutes, 23 * 60 + 59));

export function endAfter(start, end) {
  if (!start || !end || toMinutes(end) > toMinutes(start)) return end;
  const afternoon = toMinutes(end) + 12 * 60;
  return toMinutes(end) < 12 * 60 && afternoon > toMinutes(start) ? fromMinutes(afternoon) : end;
}

export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function todayLocal() {
  const now = new Date();
  return `${currentMonth()}-${String(now.getDate()).padStart(2, '0')}`;
}
