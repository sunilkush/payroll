// Server ke status (PRESENT, HALF_DAY...) -> Pill ka rang aur dikhne wala naam.
//   hara: Present / Completed / Approved        amber: Half day / Pending / Draft / Late
//   laal: Rejected / Missed / Absent            neela: Leave / Checked in
//   neutral: Upcoming / Open / Off
const VARIANT = {
  PRESENT: 'success',
  COMPLETED: 'success',
  APPROVED: 'success',
  FINAL: 'success',
  PAID: 'success',
  VERIFIED: 'success',
  HALF_DAY: 'warning',
  PENDING: 'warning',
  DRAFT: 'warning',
  LATE: 'warning',
  REJECTED: 'danger',
  MISSED: 'danger',
  ABSENT: 'danger',
  FAILED: 'danger',
  LEAVE: 'info',
  CHECKED_IN: 'info',
  SCHEDULED: 'neutral',
  QR_SENT: 'neutral',
  UPCOMING: 'neutral',
  OPEN: 'neutral',
  WEEK_OFF: 'neutral',
  HOLIDAY: 'neutral',
  NOT_MARKED: 'neutral',
  CANCELLED: 'neutral',
};

const LABEL = {
  HALF_DAY: 'Half day',
  CHECKED_IN: 'Checked in',
  SCHEDULED: 'Upcoming',
  QR_SENT: 'Upcoming',
  WEEK_OFF: 'Off',
  NOT_MARKED: 'Not marked',
};

export const statusVariant = (status) => VARIANT[status] ?? 'neutral';

// 'PRESENT' -> 'Present'
export const statusLabel = (status) =>
  LABEL[status] ?? (status ? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ') : '');
