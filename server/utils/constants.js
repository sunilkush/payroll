export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
});

export const ROLE_VALUES = Object.values(ROLES);

// Company ka plan. Ye chaar code fix hain; har plan ka naam, daam, staff ki hadd aur features Super Admin badalta hai.
// Khud register karne wali company FREE se shuru hoti hai; Super Admin ki banayi (aur purani) companies ENTERPRISE par.
export const COMPANY_PLANS = Object.freeze({
  FREE: 'FREE',
  STARTER: 'STARTER',
  PROFESSIONAL: 'PROFESSIONAL',
  ENTERPRISE: 'ENTERPRISE',
});

// Chhote se bade tak (upgrade = is list mein aage ka plan)
export const PLAN_ORDER = Object.freeze(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']);

// Features jo plan ke hisaab se khulte / band hote hain. Kis plan mein kaun sa hai, daam aur staff ki hadd:
// ye sab Super Admin tay karta hai (Global Settings; dekho services/planService.js). Staff, geofence attendance
// aur dashboard har plan mein hain.
//   leave        CL / EL leave management
//   corrections  punch correction requests
//   payroll      payroll aur salary slips
//   statutory    PF / ESI
//   workTime     working hours (late / early out)
//   sales        sales meetings (QR visit)
//   exports      Excel exports
export const FEATURE_LABEL = Object.freeze({
  leave: 'Leave management',
  corrections: 'Punch corrections',
  payroll: 'Payroll',
  statutory: 'PF & ESI',
  workTime: 'Working hours',
  sales: 'Sales meetings',
  exports: 'Excel export',
});

// Company ki kaun si setting kis feature ke peeche hai (plan mein feature na ho to setting ON nahi ho sakti)
export const SETTING_FEATURE = Object.freeze({
  leaveEnabled: 'leave',
  pfEnabled: 'statutory',
  esiEnabled: 'statutory',
  workTimeEnabled: 'workTime',
  salesEnabled: 'sales',
});

export const PLAN_REQUEST_STATUS = Object.freeze({ PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED' });

export const PAYROLL_STATUS = Object.freeze({ DRAFT: 'DRAFT', FINAL: 'FINAL' });

export const LEAVE_TYPES = Object.freeze(['CL', 'EL']);

// Half day leave din ke kis hisse ki hai.
export const HALF_DAY_SESSIONS = Object.freeze(['FIRST', 'SECOND']);

export const LEAVE_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
});

// Punch correction request ke status wahi hain jo leave ke.
export const CORRECTION_STATUS = LEAVE_STATUS;

// ---------- Sales meetings (client visit, QR + geofence se verify) ----------

// SCHEDULED -> QR_SENT -> CHECKED_IN -> COMPLETED. Time nikal jaye aur check-in na ho to MISSED.
// (QR ka expire hona meeting ka status nahi hai; wo qr.expiresAt se pata chalta hai.)
export const MEETING_STATUS = Object.freeze({
  SCHEDULED: 'SCHEDULED',
  QR_SENT: 'QR_SENT',
  CHECKED_IN: 'CHECKED_IN',
  COMPLETED: 'COMPLETED',
  MISSED: 'MISSED',
  CANCELLED: 'CANCELLED',
});

// Jin status mein check-in abhi ho sakta hai.
export const MEETING_OPEN_STATUSES = Object.freeze([MEETING_STATUS.SCHEDULED, MEETING_STATUS.QR_SENT]);

// Check-in / check-out ke waqt location ka nateeja.
export const LOCATION_STATUS = Object.freeze({
  VERIFIED: 'VERIFIED',
  OUTSIDE_GEOFENCE: 'OUTSIDE_GEOFENCE',
  LOCATION_UNAVAILABLE: 'LOCATION_UNAVAILABLE',
  LOW_ACCURACY: 'LOW_ACCURACY',
});

export const MEETING_OUTCOMES = Object.freeze([
  'INTERESTED',
  'FOLLOW_UP_REQUIRED',
  'PROPOSAL_REQUIRED',
  'DEMO_REQUIRED',
  'NOT_INTERESTED',
  'DEAL_CLOSED',
  'RESCHEDULED',
  'CLIENT_UNAVAILABLE',
]);

export const FOLLOW_UP_STATUS = Object.freeze({ PENDING: 'PENDING', DONE: 'DONE', CANCELLED: 'CANCELLED' });

// Meeting ki audit history (meeting.events) mein aane wali ghatnayein.
export const MEETING_EVENTS = Object.freeze({
  CREATED: 'CREATED',
  UPDATED: 'UPDATED',
  QR_GENERATED: 'QR_GENERATED',
  QR_SENT: 'QR_SENT',
  QR_SCANNED: 'QR_SCANNED',
  CHECK_IN_REJECTED: 'CHECK_IN_REJECTED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  COMPLETED: 'COMPLETED',
  MISSED: 'MISSED',
  CANCELLED: 'CANCELLED',
});

export const DEFAULT_MEETING_RADIUS = 100; // meters

// DB mein sirf PRESENT save hota hai (punch in par). Baaki status monthly report banate
// waqt nikalte hain: holiday, week off, leave ya absent.
export const ATTENDANCE_STATUS = Object.freeze({
  PRESENT: 'PRESENT',
  HALF_DAY: 'HALF_DAY', // aadha din kaam (punch hua) + aadha din approved leave
  LEAVE: 'LEAVE',
  ABSENT: 'ABSENT',
  WEEK_OFF: 'WEEK_OFF',
  HOLIDAY: 'HOLIDAY',
  NOT_MARKED: 'NOT_MARKED', // aaj ka din, abhi punch in nahi hua
  PENDING: 'PENDING', // abhi kaam chal raha hai / interim status
});
