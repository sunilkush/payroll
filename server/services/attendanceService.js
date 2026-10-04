import { Attendance } from '../models/Attendance.js';
import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { Leave } from '../models/Leave.js';
import { ATTENDANCE_STATUS, LEAVE_STATUS, ROLES } from '../utils/constants.js';
import { datesBetween, daysOfMonth, toDateStr, todayStr, weekdayOf } from '../utils/dateUtil.js';
import { getTenantId } from '../utils/tenantContext.js';
import { checkGeofence } from './geoService.js';

async function getCompanyOrThrow() {
  const company = await Company.findById(getTenantId());
  if (!company) throw new ApiError(404, 'Company nahi mili.');
  return company;
}

// Punch in aur punch out dono par same rule: GPS accuracy theek ho aur office range ke andar ho.
function verifyLocation(company, { lat, lng, accuracy }) {
  if (!company.locations.length) {
    throw new ApiError(400, 'Office location set nahi hai. Admin se contact karein.');
  }
  if (accuracy > company.settings.maxGpsAccuracy) {
    throw new ApiError(
      400,
      `GPS accuracy kharab hai (${Math.round(accuracy)}m). Khuli jagah par jaakar dobara try karein.`
    );
  }
  const geo = checkGeofence(company.locations, { lat, lng });
  if (!geo.allowed) {
    throw new ApiError(403, `Aap office range se bahar hain (${geo.distance}m).`);
  }
  return geo;
}

const buildPunch = (position, geo, meta) => ({
  time: new Date(),
  lat: position.lat,
  lng: position.lng,
  accuracy: position.accuracy,
  distance: geo.distance,
  locationName: geo.location.name,
  ip: meta.ip,
  userAgent: meta.userAgent,
});

export async function punchIn(user, position, meta) {
  const company = await getCompanyOrThrow();
  const geo = verifyLocation(company, position);
  const date = todayStr();

  if (await Attendance.exists({ userId: user._id, date })) {
    throw new ApiError(409, 'Aaj ka punch in pehle ho chuka hai.');
  }
  try {
    return await Attendance.create({ userId: user._id, date, punchIn: buildPunch(position, geo, meta) });
  } catch (err) {
    // Do request ek saath aayein to unique index (userId + date) rokta hai.
    if (err.code === 11000) throw new ApiError(409, 'Aaj ka punch in pehle ho chuka hai.');
    throw err;
  }
}

export async function punchOut(user, position, meta) {
  const company = await getCompanyOrThrow();
  const record = await Attendance.findOne({ userId: user._id, date: todayStr() });
  if (!record) throw new ApiError(400, 'Aaj punch in nahi hua hai.');
  if (record.punchOut) throw new ApiError(409, 'Aaj ka punch out pehle ho chuka hai.');

  const geo = verifyLocation(company, position);
  record.punchOut = buildPunch(position, geo, meta);
  record.missedPunchOut = false;
  await record.save();
  return record;
}

export async function getToday(user) {
  const company = await getCompanyOrThrow();
  const date = todayStr();
  const attendance = await Attendance.findOne({ userId: user._id, date });
  return {
    date,
    attendance,
    locations: company.locations.map(({ name, radius }) => ({ name, radius })),
  };
}

// Ek staff ke ek mahine ka din-wise status + totals.
function buildMonth({ user, records, leaves, company, month }) {
  // Approved leave ki har date -> leave type (CL/EL)
  const leaveByDate = new Map();
  for (const leave of leaves) {
    for (const date of datesBetween(leave.fromDate, leave.toDate)) leaveByDate.set(date, leave.type);
  }

  const today = todayStr();
  // Joining (ya account banne) se pehle ke din ginti mein nahi aate.
  const joining = user.joiningDate ? toDateStr(user.joiningDate) : '';
  const created = toDateStr(user.createdAt);
  const trackedFrom = joining > created ? joining : created;

  const recordByDate = new Map(records.map((record) => [record.date, record]));
  const holidayByDate = new Map(company.holidays.map((holiday) => [holiday.date, holiday.name]));
  const summary = { present: 0, absent: 0, weekOff: 0, holiday: 0, leave: 0, missedPunchOut: 0 };

  const days = daysOfMonth(month).map((date) => {
    const record = recordByDate.get(date);
    const day = { date, weekday: weekdayOf(date), status: null };

    if (record) {
      day.status = ATTENDANCE_STATUS.PRESENT;
      day.punchIn = record.punchIn;
      day.punchOut = record.punchOut ?? null;
      day.missedPunchOut = record.missedPunchOut;
      summary.present += 1;
      if (record.missedPunchOut) summary.missedPunchOut += 1;
    } else if (date > today || date < trackedFrom) {
      day.status = null;
    } else if (holidayByDate.has(date)) {
      day.status = ATTENDANCE_STATUS.HOLIDAY;
      day.note = holidayByDate.get(date);
      summary.holiday += 1;
    } else if (company.settings.weekOffDays.includes(day.weekday)) {
      day.status = ATTENDANCE_STATUS.WEEK_OFF;
      summary.weekOff += 1;
    } else if (leaveByDate.has(date)) {
      day.status = ATTENDANCE_STATUS.LEAVE;
      day.note = leaveByDate.get(date);
      summary.leave += 1;
    } else if (date === today) {
      day.status = ATTENDANCE_STATUS.NOT_MARKED;
    } else {
      day.status = ATTENDANCE_STATUS.ABSENT;
      summary.absent += 1;
    }
    return day;
  });

  return { days, summary };
}

const monthRange = (month) => ({ $gte: `${month}-01`, $lte: `${month}-31` });

// Us mahine ko chhoone wali approved leaves.
const approvedLeavesIn = (month, filter = {}) =>
  Leave.find({
    ...filter,
    status: LEAVE_STATUS.APPROVED,
    fromDate: { $lte: `${month}-31` },
    toDate: { $gte: `${month}-01` },
  });

function groupByUser(items) {
  const groups = new Map();
  for (const item of items) {
    const key = String(item.userId);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

const toStaffInfo = (user) => ({
  _id: user._id,
  name: user.name,
  employeeCode: user.employeeCode,
  isActive: user.isActive,
});

// Staff sirf apni attendance dekhta hai. Admin ko userId dena hota hai.
export async function getMonthly({ requester, userId, month }) {
  let user = requester;
  if (requester.role !== ROLES.STAFF) {
    if (!userId) throw new ApiError(400, 'userId zaroori hai.');
    user = await User.findOne({ _id: userId, role: ROLES.STAFF });
    if (!user) throw new ApiError(404, 'Staff nahi mila.');
  }

  const [company, records, leaves] = await Promise.all([
    getCompanyOrThrow(),
    Attendance.find({ userId: user._id, date: monthRange(month) }),
    approvedLeavesIn(month, { userId: user._id }),
  ]);
  return { month, staff: toStaffInfo(user), ...buildMonth({ user, records, leaves, company, month }) };
}

// Company ke saare staff ke mahine ke totals: [{ user, summary }]. Payroll bhi isi se LOP nikalta hai.
export async function getStaffMonthSummaries(month) {
  const [company, staff, records, leaves] = await Promise.all([
    getCompanyOrThrow(),
    User.find({ role: ROLES.STAFF }).sort({ name: 1 }),
    Attendance.find({ date: monthRange(month) }),
    approvedLeavesIn(month),
  ]);

  const recordsByUser = groupByUser(records);
  const leavesByUser = groupByUser(leaves);

  const rows = staff.map((user) => {
    const key = String(user._id);
    const { summary } = buildMonth({
      user,
      records: recordsByUser.get(key) ?? [],
      leaves: leavesByUser.get(key) ?? [],
      company,
      month,
    });
    return { user, summary };
  });
  return { company, rows };
}

// Admin report: saare staff ke mahine ke totals.
export async function getReport(month) {
  const { rows } = await getStaffMonthSummaries(month);
  return { month, rows: rows.map(({ user, summary }) => ({ staff: toStaffInfo(user), summary })) };
}

// Cron ke liye: jin dino punch out nahi hua un par flag lagata hai. Din PRESENT hi rehta hai.
// Tenant context ke bahar chalta hai, isliye saari companies par lagu hota hai.
export async function markMissedPunchOuts({ includeToday }) {
  const today = todayStr();
  const result = await Attendance.updateMany(
    { date: includeToday ? { $lte: today } : { $lt: today }, punchOut: null, missedPunchOut: false },
    { $set: { missedPunchOut: true } }
  );
  return result.modifiedCount;
}
