export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
});

export const ROLE_VALUES = Object.values(ROLES);

// Company ka plan. Khud register karne wali company FREE se shuru hoti hai; Super Admin ki banayi (aur purani)
// companies ENTERPRISE par hain, yaani koi hadd nahi. Plan sirf Super Admin badal sakta hai.
export const COMPANY_PLANS = Object.freeze({
  FREE: 'FREE',
  STARTER: 'STARTER',
  PROFESSIONAL: 'PROFESSIONAL',
  ENTERPRISE: 'ENTERPRISE',
});

// Plan mein kitne active staff ho sakte hain. null = koi hadd nahi.
// (Landing page ke pricing mein bhi yahi numbers hain: client/src/pages/Landing/landingConfig.js)
export const PLAN_STAFF_LIMIT = Object.freeze({ FREE: 10, STARTER: 50, PROFESSIONAL: 250, ENTERPRISE: null });

// Chhote se bade tak (upgrade = is list mein aage ka plan)
export const PLAN_ORDER = Object.freeze(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']);
export const PLAN_LABEL = Object.freeze({ FREE: 'Free', STARTER: 'Starter', PROFESSIONAL: 'Professional', ENTERPRISE: 'Enterprise' });

// Plan mein kaun se features milte hain. Staff, geofence attendance aur dashboard har plan mein hain.
//   leave        CL / EL leave management
//   corrections  punch correction requests
//   payroll      payroll aur salary slips
//   statutory    PF / ESI
//   workTime     working hours (late / early out)
//   sales        sales meetings (QR visit)
//   exports      Excel exports
const STARTER_FEATURES = ['leave', 'corrections', 'payroll'];
const PRO_FEATURES = [...STARTER_FEATURES, 'statutory', 'workTime', 'sales', 'exports'];
export const PLAN_FEATURES = Object.freeze({
  FREE: Object.freeze([]),
  STARTER: Object.freeze(STARTER_FEATURES),
  PROFESSIONAL: Object.freeze(PRO_FEATURES),
  ENTERPRISE: Object.freeze(PRO_FEATURES),
});

export const FEATURE_LABEL = Object.freeze({
  leave: 'Leave management',
  corrections: 'Punch corrections',
  payroll: 'Payroll',
  statutory: 'PF & ESI',
  workTime: 'Working hours',
  sales: 'Sales meetings',
  exports: 'Excel export',
});

// Feature sabse pehle kis plan mein milta hai (error message mein batane ke liye)
export const FEATURE_MIN_PLAN = Object.freeze(
  Object.fromEntries(Object.keys(FEATURE_LABEL).map((feature) => [feature, PLAN_ORDER.find((plan) => PLAN_FEATURES[plan].includes(feature))]))
);

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
});
