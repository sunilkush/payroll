// Meeting ka dikhne wala status (admin + staff). Server ka MISSED cron se lagta hai; tab tak khuli meeting jiska
// check-in waqt nikal gaya use bhi Missed dikhate hain (server ke dashboard jaisa).
export const OPEN_STATUSES = ['SCHEDULED', 'QR_SENT'];

export function effectiveStatus(meeting, graceMinutes = 30, now = Date.now()) {
  if (OPEN_STATUSES.includes(meeting.status) && now > new Date(meeting.endAt).getTime() + graceMinutes * 60000) return 'MISSED';
  return meeting.status;
}

// status -> Pill
export function meetingPill(meeting, graceMinutes = 30, now = Date.now()) {
  const status = effectiveStatus(meeting, graceMinutes, now);
  if (status === 'COMPLETED') return { variant: 'success', label: 'Completed' };
  if (status === 'CHECKED_IN') return { variant: 'info', label: 'Checked in' };
  if (status === 'MISSED') return { variant: 'danger', label: 'Missed' };
  if (status === 'CANCELLED') return { variant: 'neutral', label: 'Cancelled' };
  const opensAt = new Date(meeting.startAt).getTime() - graceMinutes * 60000;
  return { variant: 'neutral', label: now >= opensAt ? 'Check-in open' : 'Upcoming' };
}

const pad = (value) => String(value).padStart(2, '0');
export const dateStrOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Us hafte ke 7 din (Monday se), 'YYYY-MM-DD'
export function weekOf(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(monday);
    next.setDate(monday.getDate() + index);
    return dateStrOf(next);
  });
}

export function shiftDays(dateStr, days) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return dateStrOf(new Date(year, month - 1, day + days));
}
