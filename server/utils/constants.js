export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
});

export const ROLE_VALUES = Object.values(ROLES);

export const PAYROLL_STATUS = Object.freeze({ DRAFT: 'DRAFT', FINAL: 'FINAL' });

export const LEAVE_TYPES = Object.freeze(['CL', 'EL']);

export const LEAVE_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
});

// DB mein sirf PRESENT save hota hai (punch in par). Baaki status monthly report banate
// waqt nikalte hain: holiday, week off, leave ya absent.
export const ATTENDANCE_STATUS = Object.freeze({
  PRESENT: 'PRESENT',
  LEAVE: 'LEAVE',
  ABSENT: 'ABSENT',
  WEEK_OFF: 'WEEK_OFF',
  HOLIDAY: 'HOLIDAY',
  NOT_MARKED: 'NOT_MARKED', // aaj ka din, abhi punch in nahi hua
});
