import { getMonthlyAttendanceApi } from '../api/endpoints';
import { currentMonth, shiftMonth } from './format';

export const LEAVE_NAME = { CL: 'Casual Leave', EL: 'Earned Leave' };
export const LEAVE_SHORT = { CL: 'Casual', EL: 'Earned' };

// 4.5 -> '4.5', 7 -> '7.0' (leave hamesha aadhe din tak)
export const formatLeaveDays = (days) => (Number(days) || 0).toFixed(1);

// '1 day', '0.5 day', '3 days'
export const dayCount = (days) => `${days} ${days > 1 ? 'days' : 'day'}`;

const pad = (value) => String(value).padStart(2, '0');

// 'YYYY-MM-DD' ki saari tarikhen (dono shamil)
export function datesBetween(from, to) {
  const dates = [];
  const [year, month, day] = from.split('-').map(Number);
  const cursor = new Date(year, month - 1, day);
  const end = to;
  for (let guard = 0; guard < 400; guard += 1) {
    const current = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
    if (current > end) break;
    dates.push(current);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

const weekdayOf = (date) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
};

// Company ke weekly off din staff ko API mein seedhe nahi milte; is aur pichhle mahine ki attendance mein
// jo din WEEK_OFF dikhe unke weekday se pata chalta hai. Kuch na mile to server ka default: Sunday.
export async function guessWeekOffDays() {
  const month = currentMonth();
  const results = await Promise.allSettled([getMonthlyAttendanceApi(month), getMonthlyAttendanceApi(shiftMonth(month, -1))]);
  const found = new Set();
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const day of result.value.data.days) if (day.status === 'WEEK_OFF') found.add(day.weekday);
  }
  return found.size ? [...found] : [0];
}

// Kitne din katenge: half day = 0.5, warna weekly off chhod kar din. Holidays server hi jaanta hai (wo bhi nahi ginte),
// isliye ye andaza hai; asli ginti server karta hai.
export function estimateLeaveDays({ fromDate, toDate, halfDay, weekOffDays }) {
  if (!fromDate || !toDate || toDate < fromDate) return 0;
  if (halfDay) return 0.5;
  return datesBetween(fromDate, toDate).filter((date) => !weekOffDays.includes(weekdayOf(date))).length;
}
