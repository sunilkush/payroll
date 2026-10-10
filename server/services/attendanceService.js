import { Attendance } from '../models/Attendance.js';
import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { Leave } from '../models/Leave.js';
import { ATTENDANCE_STATUS, LEAVE_STATUS, ROLES } from '../utils/constants.js';
import { datesBetween, daysOfMonth, minutesOfDay, timeToMinutes, toDateStr, todayStr, weekdayOf } from '../utils/dateUtil.js';
import { getTenantId } from '../utils/tenantContext.js';
import { checkGeofence } from './geoService.js';

async function getCompanyOrThrow() {
  const company = await Company.findById(getTenantId());
  if (!company) throw new ApiError(404, 'Company not found.');
  return company;
}

// Punch in aur punch out dono par same rule: GPS accuracy theek ho aur office range ke andar ho.
function verifyLocation(company, { lat, lng, accuracy }) {
  if (!company.locations.length) {
    throw new ApiError(400, 'No office location is set. Please contact your admin.');
  }
  if (accuracy > company.settings.maxGpsAccuracy) {
    throw new ApiError(
      400,
      `GPS accuracy is too low (${Math.round(accuracy)}m). Move to an open area and try again.`
    );
  }
  const geo = checkGeofence(company.locations, { lat, lng });
  if (!geo.allowed) {
    throw new ApiError(403, `You are outside the office range (${geo.distance}m).`);
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
    throw new ApiError(409, 'You have already punched in today.');
  }
  try {
    return await Attendance.create({ userId: user._id, date, punchIn: buildPunch(position, geo, meta) });
  } catch (err) {
    // Do request ek saath aayein to unique index (userId + date) rokta hai.
    if (err.code === 11000) throw new ApiError(409, 'You have already punched in today.');
    throw err;
  }
}

export async function punchOut(user, position, meta) {
  const company = await getCompanyOrThrow();
  const record = await Attendance.findOne({ userId: user._id, date: todayStr() });
  if (!record) throw new ApiError(400, 'You have not punched in today.');
  if (record.punchOut) throw new ApiError(409, 'You have already punched out today.');

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
    // lat/lng bhi: staff ke Punch page ka map office aur uski range dikhata hai
    locations: company.locations.map(({ name, lat, lng, radius }) => ({ name, lat, lng, radius })),
    // Working time ON ho to staff ko office ka time dikhe; warna null
    workTime: company.settings.workTimeEnabled
      ? { start: company.settings.workStartTime, end: company.settings.workEndTime, lateGraceMin: company.settings.lateGraceMin }
      : null,
  };
}

// Ek staff ke ek mahine ka din-wise status + totals.
function buildMonth({ user, records, leaves, company, month }) {
  // Approved leave ki har date -> { type: CL/EL, halfDay: FIRST/SECOND ya undefined }
  const leaveByDate = new Map();
  for (const { fromDate, toDate, type, halfDay } of leaves) {
    for (const date of datesBetween(fromDate, toDate)) leaveByDate.set(date, { type, halfDay });
  }

  const today = todayStr();
  // Joining (ya account banne) se pehle ke din ginti mein nahi aate.
  const joining = user.joiningDate ? toDateStr(user.joiningDate) : '';
  const created = toDateStr(user.createdAt);
  const trackedFrom = joining > created ? joining : created;

  const recordByDate = new Map(records.map((record) => [record.date, record]));
  const holidayByDate = new Map(company.holidays.map((holiday) => [holiday.date, holiday.name]));
  const summary = { present: 0, absent: 0, weekOff: 0, holiday: 0, leave: 0, missedPunchOut: 0 };

  // Working time ON ho to hi late / jaldi jaana ginte hain (purani companies ki report waisi hi rahe).
  const work = company.settings.workTimeEnabled
    ? {
        lateAfter: timeToMinutes(company.settings.workStartTime) + company.settings.lateGraceMin,
        end: timeToMinutes(company.settings.workEndTime),
      }
    : null;
  if (work) Object.assign(summary, { late: 0, earlyOut: 0 });

  const days = daysOfMonth(month).map((date) => {
    const record = recordByDate.get(date);
    const day = { date, weekday: weekdayOf(date), status: null };
    const leave = leaveByDate.get(date);
    // Half day leave: aadha din leave (paid), baaki aadha kaam. Punch hua to aadha present, warna aadha absent.
    const halfLeave = leave?.halfDay ? leave : null;

    if (record) {
      day.status = halfLeave ? ATTENDANCE_STATUS.HALF_DAY : ATTENDANCE_STATUS.PRESENT;
      day.punchIn = record.punchIn;
      day.punchOut = record.punchOut ?? null;
      day.missedPunchOut = record.missedPunchOut;
      if (halfLeave) {
        day.note = halfLeave.type;
        day.halfDay = halfLeave.halfDay;
        summary.present += 0.5;
        summary.leave += 0.5;
      } else {
        summary.present += 1;
      }
      if (record.missedPunchOut) summary.missedPunchOut += 1;
      if (record.punchOut) day.workedMinutes = Math.max(0, Math.round((record.punchOut.time - record.punchIn.time) / 60000));
      // Half day leave wale din der se aana / jaldi jaana galti nahi hai.
      if (work && !halfLeave) {
        day.late = minutesOfDay(record.punchIn.time) > work.lateAfter;
        day.earlyOut = Boolean(record.punchOut) && minutesOfDay(record.punchOut.time) < work.end;
        if (day.late) summary.late += 1;
        if (day.earlyOut) summary.earlyOut += 1;
      }
    } else if (date > today || date < trackedFrom) {
      day.status = null;
    } else if (holidayByDate.has(date)) {
      day.status = ATTENDANCE_STATUS.HOLIDAY;
      day.note = holidayByDate.get(date);
      summary.holiday += 1;
    } else if (company.settings.weekOffDays.includes(day.weekday)) {
      day.status = ATTENDANCE_STATUS.WEEK_OFF;
      summary.weekOff += 1;
    } else if (halfLeave) {
      // Leave wala aadha din paid hai; kaam wale aadhe din punch nahi hua.
      day.status = date === today ? ATTENDANCE_STATUS.NOT_MARKED : ATTENDANCE_STATUS.ABSENT;
      day.note = halfLeave.type;
      day.halfDay = halfLeave.halfDay;
      summary.leave += 0.5;
      if (date !== today) summary.absent += 0.5;
    } else if (leave) {
      day.status = ATTENDANCE_STATUS.LEAVE;
      day.note = leave.type;
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
  department: user.department || '',
  designation: user.designation || '',
  isActive: user.isActive,
});

// Staff sirf apni attendance dekhta hai. Admin ko userId dena hota hai.
export async function getMonthly({ requester, userId, month }) {
  let user = requester;
  if (requester.role !== ROLES.STAFF) {
    if (!userId) throw new ApiError(400, 'userId is required.');
    user = await User.findOne({ _id: userId, role: ROLES.STAFF });
    if (!user) throw new ApiError(404, 'Staff member not found.');
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

// Admin report Excel export data
export async function getExportData(month) {
  const { company, rows } = await getStaffMonthSummaries(month);
  return { month, company, rows: rows.map(({ user, summary }) => ({ staff: toStaffInfo(user), summary })) };
}

// Admin dashboard ke liye: aaj kitne active staff present hain, kitne leave par, kitno ne punch nahi kiya.
export async function getTodaySummary() {
  const company = await getCompanyOrThrow();
  const date = todayStr();
  const [staff, records, leaves] = await Promise.all([
    User.find({ role: ROLES.STAFF, isActive: true }).select('_id'),
    Attendance.find({ date }).select('userId punchOut'),
    Leave.find({ status: LEAVE_STATUS.APPROVED, fromDate: { $lte: date }, toDate: { $gte: date } }).select('userId'),
  ]);

  const activeIds = new Set(staff.map((user) => String(user._id)));
  const todays = records.filter((record) => activeIds.has(String(record.userId)));
  const presentIds = new Set(todays.map((record) => String(record.userId)));
  const onLeave = new Set(
    leaves.map((leave) => String(leave.userId)).filter((id) => activeIds.has(id) && !presentIds.has(id))
  ).size;

  let dayType = 'WORKING';
  if (company.settings.weekOffDays.includes(weekdayOf(date))) dayType = 'WEEK_OFF';
  if (company.holidays.some((holiday) => holiday.date === date)) dayType = 'HOLIDAY';

  return {
    date,
    dayType,
    totalStaff: activeIds.size,
    present: presentIds.size,
    punchedOut: todays.filter((record) => record.punchOut).length,
    onLeave,
    notMarked: activeIds.size - presentIds.size - onLeave,
    // 0 ho to staff punch nahi kar sakta; dashboard admin ko yaad dilata hai
    locationsCount: company.locations.length,
  };
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
