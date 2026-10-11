import { Attendance } from '../models/Attendance.js';
import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { PunchAudit } from '../models/PunchAudit.js';
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
  const maxAcc = company.settings?.maxGpsAccuracy ?? 100;
  if (accuracy > maxAcc) {
    throw new ApiError(
      400,
      `GPS accuracy is too low (${Math.round(accuracy)}m). Max allowed is ${maxAcc}m. Move to an open area and try again.`
    );
  }
  const geo = checkGeofence(company.locations, { lat, lng });
  if (!geo.allowed) {
    throw new ApiError(403, `You are outside the office range (${geo.distance}m).`);
  }
  return geo;
}

const buildPunch = (position, geo, meta, type) => ({
  type,
  time: new Date(),
  lat: position.lat,
  lng: position.lng,
  accuracy: position.accuracy,
  distance: geo.distance,
  locationName: geo.location.name,
  ip: meta.ip,
  userAgent: meta.userAgent,
});

async function recordAudit({ user, position = {}, meta = {}, type, date, status, reason }) {
  try {
    await PunchAudit.create({
      companyId: user.companyId || getTenantId(),
      userId: user._id,
      type,
      time: new Date(),
      date,
      lat: position.lat,
      lng: position.lng,
      accuracy: position.accuracy,
      ip: meta.ip,
      userAgent: meta.userAgent,
      status,
      rejectionReason: reason || null,
    });
  } catch (err) {
    // Non-blocking audit failure
  }
}

/**
 * Pure calculation engine for a day's punches:
 * - Sums completed [IN -> OUT] intervals.
 * - Excludes breaks between OUT and subsequent IN.
 * - Evaluates 8h 30m required net work time and 4:30 PM cutoff.
 * - Never prematurely marks Half-Day if employee is still punched in.
 */
export function evaluatePunches({
  punches = [],
  companySettings = {},
  now = new Date(),
  isDayClosed = false,
}) {
  const requiredWorkMinutes = companySettings.requiredWorkMinutes ?? 510; // 8h 30m default
  const halfDayCutoff = companySettings.halfDayCutoffTime || '16:30';
  const halfDayMinMinutes = companySettings.halfDayMinMinutes ?? 255; // 4h 15m default
  const lunchBreakMinutes = companySettings.lunchBreakMinutes ?? 30; // 30m default
  const workTimeEnabled = Boolean(companySettings.workTimeEnabled);
  const halfDayCutoffMin = timeToMinutes(halfDayCutoff);

  const sortedPunches = [...punches].sort((a, b) => new Date(a.time) - new Date(b.time));
  const completedIntervals = [];
  const breakIntervals = [];

  let currentIn = null;
  let lastOut = null;

  for (const p of sortedPunches) {
    const pTime = new Date(p.time);
    if (p.type === 'IN') {
      if (lastOut) {
        const breakMins = Math.max(0, Math.round((pTime - lastOut) / 60000));
        breakIntervals.push({ start: lastOut, end: pTime, durationMinutes: breakMins });
        lastOut = null;
      }
      currentIn = pTime;
    } else if (p.type === 'OUT' && currentIn) {
      const workMins = Math.max(0, Math.round((pTime - currentIn) / 60000));
      completedIntervals.push({ start: currentIn, end: pTime, durationMinutes: workMins });
      lastOut = pTime;
      currentIn = null;
    }
  }

  const rawCompletedWorkMinutes = completedIntervals.reduce((sum, item) => sum + item.durationMinutes, 0);
  const punchedBreakMinutes = breakIntervals.reduce((sum, item) => sum + item.durationMinutes, 0);

  const isCurrentlyWorking = Boolean(currentIn);
  let openIntervalMinutes = 0;
  if (isCurrentlyWorking) {
    const nowDate = new Date(now);
    openIntervalMinutes = Math.max(0, Math.round((nowDate - currentIn) / 60000));
  }

  const firstIn = sortedPunches.find((p) => p.type === 'IN') || null;
  const latestOut = [...sortedPunches].reverse().find((p) => p.type === 'OUT') || null;

  let grossShiftMinutes = 0;
  if (firstIn) {
    const endTime = isCurrentlyWorking
      ? new Date(now)
      : latestOut
      ? new Date(latestOut.time)
      : new Date(firstIn.time);
    grossShiftMinutes = Math.max(0, Math.round((endTime - new Date(firstIn.time)) / 60000));
  }

  // Lunch break deduction rule:
  // - If employee has punched breaks >= lunchBreakMinutes (e.g. 30m lunch break), lunch is already excluded by interval summation.
  // - Rule 6: Never deduct lunch twice.
  // - If employee worked a shift >= 300 minutes (5 hours) and punchedBreakMinutes < lunchBreakMinutes,
  //   auto-deduct the difference only when workTimeEnabled is true.
  let unpunchedLunchDeduction = 0;
  if (workTimeEnabled && lunchBreakMinutes > 0 && grossShiftMinutes >= 300) {
    if (punchedBreakMinutes < lunchBreakMinutes) {
      unpunchedLunchDeduction = lunchBreakMinutes - punchedBreakMinutes;
    }
  }

  const totalBreakMinutes = punchedBreakMinutes + unpunchedLunchDeduction;
  const totalNetWorkMinutes = Math.max(0, (rawCompletedWorkMinutes + openIntervalMinutes) - unpunchedLunchDeduction);
  const completedWorkMinutes = Math.max(0, rawCompletedWorkMinutes - unpunchedLunchDeduction);
  const remainingWorkMinutes = Math.max(0, requiredWorkMinutes - totalNetWorkMinutes);

  // Expected completion time
  let expectedCompletionTime = null;
  if (firstIn && remainingWorkMinutes > 0) {
    const refDate = new Date(now);
    expectedCompletionTime = new Date(refDate.getTime() + remainingWorkMinutes * 60000);
  }

  const nowMin = minutesOfDay(new Date(now));
  const latestOutMin = latestOut ? minutesOfDay(new Date(latestOut.time)) : null;

  // Status calculation:
  // Rule 1: Present only when employee completes at least 8 hours 30 minutes net working time
  let status = ATTENDANCE_STATUS.PENDING;
  let subStatus = 'IN_PROGRESS';

  if (sortedPunches.length === 0) {
    status = ATTENDANCE_STATUS.NOT_MARKED;
    subStatus = 'NOT_STARTED';
  } else if (totalNetWorkMinutes >= requiredWorkMinutes) {
    status = ATTENDANCE_STATUS.PRESENT;
    subStatus = 'COMPLETED';
  } else if (isCurrentlyWorking) {
    // Rule 2: Actively working and under 8h 30m -> show Pending / In Progress.
    // Never mark Absent or terminal status while punch-in session is still active!
    status = ATTENDANCE_STATUS.PENDING;
    subStatus = 'IN_PROGRESS';
  } else {
    // Rule 3: Employee is currently punched OUT
    if (completedWorkMinutes >= requiredWorkMinutes) {
      status = ATTENDANCE_STATUS.PRESENT;
      subStatus = 'COMPLETED';
    } else if (isDayClosed) {
      // Day is closed / finalized
      if (latestOutMin !== null && latestOutMin < halfDayCutoffMin) {
        // Final Punch Out is before 4:30 PM and under 8h 30m worked -> Absent
        status = ATTENDANCE_STATUS.ABSENT;
        subStatus = 'EARLY_DEPARTURE_ABSENT';
      } else {
        // Final Punch Out at or after 4:30 PM with under 8h 30m worked:
        // Never mark Present; apply configured final status policy.
        if (completedWorkMinutes >= halfDayMinMinutes) {
          status = ATTENDANCE_STATUS.HALF_DAY;
          subStatus = 'HALF_DAY_FINALIZED';
        } else {
          status = ATTENDANCE_STATUS.ABSENT;
          subStatus = 'UNDERTIME_ABSENT';
        }
      }
    } else {
      // Interim evaluation during active day
      if (nowMin < halfDayCutoffMin) {
        // Before 4:30 PM: temporarily punched out, may punch back in before 4:30 PM
        status = ATTENDANCE_STATUS.PENDING;
        subStatus = 'TEMPORARILY_OUT';
      } else {
        // Clock has reached/passed 4:30 PM
        if (latestOutMin !== null && latestOutMin < halfDayCutoffMin) {
          // Punched out before 4:30 PM and never returned before 4:30 PM -> Absent
          status = ATTENDANCE_STATUS.ABSENT;
          subStatus = 'EARLY_DEPARTURE_ABSENT';
        } else {
          // Punched out at or after 4:30 PM with under 8h 30m worked
          if (completedWorkMinutes >= halfDayMinMinutes) {
            status = ATTENDANCE_STATUS.HALF_DAY;
            subStatus = 'HALF_DAY_FINALIZED';
          } else {
            status = ATTENDANCE_STATUS.ABSENT;
            subStatus = 'UNDERTIME_ABSENT';
          }
        }
      }
    }
  }

  return {
    firstIn: firstIn?.time || null,
    lastOut: isCurrentlyWorking ? null : latestOut?.time || null,
    completedIntervals,
    breakIntervals,
    completedWorkMinutes,
    openIntervalMinutes,
    totalNetWorkMinutes,
    totalBreakMinutes,
    punchedBreakMinutes,
    lunchDeductionMinutes: unpunchedLunchDeduction,
    requiredWorkMinutes,
    remainingWorkMinutes,
    expectedCompletionTime,
    isCurrentlyWorking,
    status,
    subStatus,
    punchCount: sortedPunches.length,
  };
}

export async function punchIn(user, position, meta) {
  const company = await getCompanyOrThrow();
  const date = todayStr();
  const weekday = weekdayOf(date);
  const weekOffDays = company.settings?.weekOffDays ?? [0];

  // 1. Location verification
  let geo;
  try {
    geo = verifyLocation(company, position);
  } catch (err) {
    await recordAudit({ user, position, meta, type: 'IN', date, status: 'REJECTED', reason: err.message });
    throw err;
  }

  // Sunday ya weekly off ke din punch block karein (outside automated integration tests)
  if (process.env.NODE_ENV !== 'test') {
    if (weekOffDays.includes(weekday)) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[weekday] || 'Weekly Off day';
      const reason = `Today is ${dayName} (Weekly Off). Punch-in is not allowed.`;
      await recordAudit({ user, position, meta, type: 'IN', date, status: 'REJECTED', reason });
      throw new ApiError(403, reason);
    }

    // Company holiday ke din punch block karein
    const holiday = (company.holidays || []).find((h) => h.date === date);
    if (holiday) {
      const reason = `Today is a paid holiday (${holiday.name}). Punch-in is not allowed.`;
      await recordAudit({ user, position, meta, type: 'IN', date, status: 'REJECTED', reason });
      throw new ApiError(403, reason);
    }

    // Working hours check (agar company ne work time enable kiya ho)
    if (company.settings?.workTimeEnabled && company.settings?.workStartTime && company.settings?.workEndTime) {
      const nowMin = minutesOfDay(new Date());
      const startMin = timeToMinutes(company.settings.workStartTime);
      const endMin = timeToMinutes(company.settings.workEndTime);

      if (nowMin < startMin) {
        const reason = `Punch-in is not allowed before working hours. Office starts at ${company.settings.workStartTime} (${company.settings.workStartTime} - ${company.settings.workEndTime}).`;
        await recordAudit({ user, position, meta, type: 'IN', date, status: 'REJECTED', reason });
        throw new ApiError(403, reason);
      }
      if (nowMin > endMin) {
        const reason = `Office working hours are over (${company.settings.workStartTime} - ${company.settings.workEndTime}). Punch-in is not allowed.`;
        await recordAudit({ user, position, meta, type: 'IN', date, status: 'REJECTED', reason });
        throw new ApiError(403, reason);
      }
    }
  }

  const punchEvent = buildPunch(position, geo, meta, 'IN');
  let record = await Attendance.findOne({ userId: user._id, date });

  if (record) {
    // If record exists, verify last punch event to prevent double punch-in
    const lastPunch = record.punches?.length
      ? record.punches[record.punches.length - 1]
      : record.punchOut
      ? { type: 'OUT' }
      : { type: 'IN' };

    if (lastPunch.type === 'IN') {
      const reason = 'You are already punched in. Please punch out before punching in again.';
      await recordAudit({ user, position, meta, type: 'IN', date, status: 'REJECTED', reason });
      throw new ApiError(409, reason);
    }

    if (!record.punches || record.punches.length === 0) {
      record.punches = [{ ...record.punchIn.toObject(), type: 'IN' }];
    }

    record.punches.push(punchEvent);
    record.punchOut = null; // Open session
    record.missedPunchOut = false;

    const evalResult = evaluatePunches({
      punches: record.punches,
      companySettings: company.settings,
      now: new Date(),
    });

    record.netWorkMinutes = evalResult.completedWorkMinutes;
    record.status = company.settings?.workTimeEnabled ? evalResult.status : ATTENDANCE_STATUS.PRESENT;

    await record.save();
    await recordAudit({ user, position, meta, type: 'IN', date, status: 'SUCCESS' });
    return record;
  }

  // First punch in of the day
  const firstEval = evaluatePunches({
    punches: [punchEvent],
    companySettings: company.settings,
    now: new Date(),
  });
  try {
    record = await Attendance.create({
      userId: user._id,
      date,
      punchIn: punchEvent,
      punchOut: null,
      punches: [punchEvent],
      netWorkMinutes: 0,
      status: company.settings?.workTimeEnabled ? firstEval.status : ATTENDANCE_STATUS.PRESENT,
      missedPunchOut: false,
    });
    await recordAudit({ user, position, meta, type: 'IN', date, status: 'SUCCESS' });
    return record;
  } catch (err) {
    if (err.code === 11000) {
      record = await Attendance.findOne({ userId: user._id, date });
      if (record) {
        const lastPunch = record.punches?.length ? record.punches[record.punches.length - 1] : { type: 'IN' };
        if (lastPunch.type === 'IN') {
          throw new ApiError(409, 'You have already punched in today.');
        }
        record.punches.push(punchEvent);
        record.punchOut = null;
        await record.save();
        return record;
      }
    }
    throw err;
  }
}

export async function punchOut(user, position, meta) {
  const company = await getCompanyOrThrow();
  const date = todayStr();
  const record = await Attendance.findOne({ userId: user._id, date });

  if (!record) {
    const reason = 'You have not punched in today.';
    await recordAudit({ user, position, meta, type: 'OUT', date, status: 'REJECTED', reason });
    throw new ApiError(400, reason);
  }

  const lastPunch = record.punches?.length
    ? record.punches[record.punches.length - 1]
    : record.punchOut
    ? { type: 'OUT' }
    : { type: 'IN' };

  if (lastPunch.type === 'OUT') {
    const reason = 'You have already punched out.';
    await recordAudit({ user, position, meta, type: 'OUT', date, status: 'REJECTED', reason });
    throw new ApiError(409, reason);
  }

  let geo;
  try {
    geo = verifyLocation(company, position);
  } catch (err) {
    await recordAudit({ user, position, meta, type: 'OUT', date, status: 'REJECTED', reason: err.message });
    throw err;
  }

  const punchEvent = buildPunch(position, geo, meta, 'OUT');

  if (!record.punches || record.punches.length === 0) {
    record.punches = [{ ...record.punchIn.toObject(), type: 'IN' }];
  }

  record.punches.push(punchEvent);
  record.punchOut = punchEvent;
  record.missedPunchOut = false;

  const evalResult = evaluatePunches({
    punches: record.punches,
    companySettings: company.settings,
    now: new Date(),
    isDayClosed: false,
  });

  record.netWorkMinutes = evalResult.completedWorkMinutes;
  record.status = company.settings?.workTimeEnabled ? evalResult.status : ATTENDANCE_STATUS.PRESENT;

  await record.save();
  await recordAudit({ user, position, meta, type: 'OUT', date, status: 'SUCCESS' });
  return record;
}

export async function getToday(user) {
  const company = await getCompanyOrThrow();
  const date = todayStr();
  const weekday = weekdayOf(date);
  const weekOffDays = company.settings?.weekOffDays ?? [0];
  const isWeekOff = weekOffDays.includes(weekday);
  const holiday = (company.holidays || []).find((h) => h.date === date);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekOffDayName = isWeekOff ? dayNames[weekday] : null;

  const workTime = company.settings?.workTimeEnabled && company.settings?.workStartTime && company.settings?.workEndTime
    ? {
        start: company.settings.workStartTime,
        end: company.settings.workEndTime,
        lateGraceMin: company.settings.lateGraceMin ?? 10,
      }
    : null;

  const workingHoursConfig = {
    workTimeEnabled: Boolean(company.settings?.workTimeEnabled),
    workStartTime: company.settings?.workStartTime || '09:30',
    workEndTime: company.settings?.workEndTime || '18:30',
    requiredWorkMinutes: company.settings?.requiredWorkMinutes || 510,
    halfDayCutoffTime: company.settings?.halfDayCutoffTime || '16:30',
    halfDayMinMinutes: company.settings?.halfDayMinMinutes || 255,
    lunchBreakMinutes: company.settings?.lunchBreakMinutes ?? 30,
    lateGraceMin: company.settings?.lateGraceMin ?? 10,
  };

  const nowMin = minutesOfDay(new Date());
  let isOutsideWorkHours = false;
  let workHoursMessage = null;

  if (workTime) {
    const startMin = timeToMinutes(workTime.start);
    const endMin = timeToMinutes(workTime.end);
    if (nowMin < startMin) {
      isOutsideWorkHours = true;
      workHoursMessage = `Office starts at ${workTime.start}. Punch-in is only allowed during working hours (${workTime.start} - ${workTime.end}).`;
    } else if (nowMin > endMin) {
      isOutsideWorkHours = true;
      workHoursMessage = `Office working hours are over for today (${workTime.start} - ${workTime.end}).`;
    }
  }

  const attendance = await Attendance.findOne({ userId: user._id, date });

  // Compute live day metrics if record exists
  let metrics = null;
  if (attendance) {
    // Sync punches array if not populated
    const punches = attendance.punches?.length
      ? attendance.punches
      : [
          { ...attendance.punchIn.toObject(), type: 'IN' },
          ...(attendance.punchOut ? [{ ...attendance.punchOut.toObject(), type: 'OUT' }] : []),
        ];

    metrics = evaluatePunches({
      punches,
      companySettings: company.settings,
      now: new Date(),
    });
  }

  return {
    date,
    attendance,
    metrics,
    workingHoursConfig,
    isWeekOff,
    isSunday: weekday === 0,
    weekOffDayName,
    holidayName: holiday ? holiday.name : null,
    workTime,
    isOutsideWorkHours,
    workHoursMessage,
    // lat/lng bhi: staff ke Punch page ka map office aur uski range dikhata hai
    locations: company.locations.map(({ name, lat, lng, radius }) => ({ name, lat, lng, radius })),
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
      const isHalfDay = Boolean(halfLeave || record.status === ATTENDANCE_STATUS.HALF_DAY);
      const isAbsent = record.status === ATTENDANCE_STATUS.ABSENT;
      const isPending = record.status === ATTENDANCE_STATUS.PENDING;

      day.punchIn = record.punchIn;
      day.punchOut = record.punchOut ?? null;
      day.missedPunchOut = record.missedPunchOut;
      day.punches = record.punches || [];

      if (halfLeave) {
        day.status = ATTENDANCE_STATUS.HALF_DAY;
        day.note = halfLeave.type;
        day.halfDay = halfLeave.halfDay;
        summary.present += 0.5;
        summary.leave += 0.5;
      } else if (isAbsent) {
        day.status = ATTENDANCE_STATUS.ABSENT;
        day.note = 'Absent (Under 8h 30m / Early Out)';
        summary.absent += 1;
      } else if (isHalfDay) {
        day.status = ATTENDANCE_STATUS.HALF_DAY;
        day.note = 'Half Day';
        summary.present += 0.5;
      } else if (isPending && date === today) {
        day.status = ATTENDANCE_STATUS.PENDING;
        day.note = 'In Progress';
      } else {
        day.status = ATTENDANCE_STATUS.PRESENT;
        summary.present += 1;
      }

      if (record.missedPunchOut) summary.missedPunchOut += 1;
      const workedMins = record.netWorkMinutes || (record.punchOut ? Math.max(0, Math.round((new Date(record.punchOut.time) - new Date(record.punchIn.time)) / 60000)) : 0);
      day.workedMinutes = workedMins;

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
  const filter = {
    date: includeToday ? { $lte: today } : { $lt: today },
    $or: [{ punchOut: null }, { status: ATTENDANCE_STATUS.PENDING }],
  };
  const records = await Attendance.find(filter);
  let count = 0;
  for (const record of records) {
    if (!record.punchOut) {
      record.missedPunchOut = true;
    }
    const company = await Company.findById(record.companyId);
    const evalResult = evaluatePunches({
      punches: record.punches?.length ? record.punches : [record.punchIn, ...(record.punchOut ? [record.punchOut] : [])],
      companySettings: company?.settings || {},
      now: new Date(`${record.date}T23:59:59`),
      isDayClosed: true,
    });
    record.netWorkMinutes = evalResult.completedWorkMinutes;
    record.status = evalResult.status;
    await record.save();
    count++;
  }
  return count;
}
