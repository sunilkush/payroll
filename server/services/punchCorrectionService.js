import { Attendance } from '../models/Attendance.js';
import { Leave } from '../models/Leave.js';
import { Payroll } from '../models/Payroll.js';
import { PunchCorrection } from '../models/PunchCorrection.js';
import { ApiError } from '../utils/ApiError.js';
import { CORRECTION_STATUS, LEAVE_STATUS, PAYROLL_STATUS, ROLES } from '../utils/constants.js';
import { monthLabel, toDateStr, todayStr, zonedTime } from '../utils/dateUtil.js';

const PUNCHES = ['punchIn', 'punchOut'];

// Final ho chuki payroll ke mahine ki attendance nahi badal sakti (salary usi se bani hai).
async function assertPayrollOpen(userId, date) {
  const period = date.slice(0, 7);
  if (await Payroll.exists({ userId, period, status: PAYROLL_STATUS.FINAL })) {
    throw new ApiError(400, `Payroll for ${monthLabel(period)} is finalized, so its attendance cannot be changed.`);
  }
}

// Correction lagne ke baad din ke punch in/out time. Jo punch request mein nahi hai wo record wala hi rehta hai.
function resolveTimes(correction, record) {
  const punchIn = correction.punchIn ?? record?.punchIn.time;
  const punchOut = correction.punchOut ?? record?.punchOut?.time;
  if (!punchIn) throw new ApiError(400, 'There is no punch in on this date, so the punch in time is required.');
  if (punchOut && punchOut <= punchIn) throw new ApiError(400, 'Punch out time must be after punch in time.');
  return { punchIn, punchOut };
}

// ---------- Request ----------

export async function requestCorrection(user, { date, punchIn, punchOut, reason }) {
  if (date > todayStr()) throw new ApiError(400, 'You cannot request a correction for a future date.');

  // Joining (ya account banne) se pehle ke din attendance mein ginte hi nahi.
  const joining = user.joiningDate ? toDateStr(user.joiningDate) : '';
  const created = toDateStr(user.createdAt);
  if (date < (joining > created ? joining : created)) {
    throw new ApiError(400, 'This date is before your attendance started.');
  }
  await assertPayrollOpen(user._id, date);

  const requested = {
    punchIn: punchIn ? zonedTime(date, punchIn) : undefined,
    punchOut: punchOut ? zonedTime(date, punchOut) : undefined,
  };
  const now = new Date();
  if (PUNCHES.some((punch) => requested[punch] > now)) {
    throw new ApiError(400, 'The corrected time cannot be in the future.');
  }

  const record = await Attendance.findOne({ userId: user._id, date });
  resolveTimes(requested, record);

  if (!record) {
    // Half day leave wale din aadha din kaam hota hai, us par correction chal sakta hai.
    const onLeave = await Leave.exists({
      userId: user._id,
      halfDay: null,
      status: { $in: [LEAVE_STATUS.PENDING, LEAVE_STATUS.APPROVED] },
      fromDate: { $lte: date },
      toDate: { $gte: date },
    });
    if (onLeave) throw new ApiError(409, 'You have leave on this date.');
  }

  try {
    return await PunchCorrection.create({
      userId: user._id,
      date,
      ...requested,
      recorded: { punchIn: record?.punchIn.time, punchOut: record?.punchOut?.time },
      reason,
    });
  } catch (err) {
    // Partial unique index (userId + date, sirf PENDING) do pending request nahi banne deta.
    if (err.code === 11000) throw new ApiError(409, 'You already have a pending request for this date.');
    throw err;
  }
}

// ---------- Approve / Reject / Cancel ----------

// Sirf PENDING request par action hota hai. Status atomically badalta hai, taaki do
// admin ek saath click karein to attendance do baar na badle.
async function decide(id, { status, actor, note, extraFilter = {} }) {
  const correction = await PunchCorrection.findOneAndUpdate(
    { _id: id, status: CORRECTION_STATUS.PENDING, ...extraFilter },
    { $set: { status, actionBy: actor._id, actionAt: new Date(), actionNote: note ?? '' } },
    { new: true }
  );
  if (!correction) {
    const exists = await PunchCorrection.exists({ _id: id, ...extraFilter });
    if (!exists) throw new ApiError(404, 'Correction request not found.');
    throw new ApiError(409, 'This correction request has already been actioned.');
  }
  return correction;
}

// Attendance mein sahi time likhta hai. Us din record na ho (punch in hi bhool gaya) to banata hai.
// Purane punch ki location bani rehti hai; corrected: true batata hai ki time admin ne manzoor kiya hai.
async function applyToAttendance(correction, times) {
  const record =
    (await Attendance.findOne({ userId: correction.userId, date: correction.date })) ??
    new Attendance({ userId: correction.userId, date: correction.date });

  for (const punch of PUNCHES) {
    if (!correction[punch]) continue;
    record[punch] = { ...record[punch]?.toObject(), time: times[punch], corrected: true };
  }
  if (record.punchOut) record.missedPunchOut = false;
  await record.save();
}

export async function approveCorrection(id, admin, note) {
  const pending = await PunchCorrection.findOne({ _id: id, status: CORRECTION_STATUS.PENDING });
  // Request ke baad haalat badal sakti hai (staff ne punch kar diya, payroll final ho gayi), isliye dobara jaancho.
  let times;
  if (pending) {
    await assertPayrollOpen(pending.userId, pending.date);
    times = resolveTimes(pending, await Attendance.findOne({ userId: pending.userId, date: pending.date }));
  }

  const correction = await decide(id, { status: CORRECTION_STATUS.APPROVED, actor: admin, note });
  try {
    await applyToAttendance(correction, times);
  } catch (err) {
    // Attendance nahi badli to request ko approved mat chhodo.
    await PunchCorrection.updateOne(
      { _id: correction._id },
      { $set: { status: CORRECTION_STATUS.PENDING }, $unset: { actionBy: 1, actionAt: 1, actionNote: 1 } }
    );
    throw err;
  }
  return correction;
}

export const rejectCorrection = (id, admin, note) =>
  decide(id, { status: CORRECTION_STATUS.REJECTED, actor: admin, note });

// Staff sirf apni pending request cancel kar sakta hai.
export const cancelCorrection = (id, user) =>
  decide(id, { status: CORRECTION_STATUS.CANCELLED, actor: user, extraFilter: { userId: user._id } });

// ---------- List ----------

// Staff: sirf apni. Admin: company ki saari (staff ke naam ke saath).
export async function listCorrections({ requester, status, page, limit }) {
  const filter = {};
  if (requester.role === ROLES.STAFF) filter.userId = requester._id;

  // Status tabs ki ginti (status filter lagne se pehle): { all, PENDING, APPROVED, REJECTED, CANCELLED }
  const byStatus = await PunchCorrection.aggregate([
    { $match: { ...filter } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const counts = { all: 0 };
  for (const value of Object.values(CORRECTION_STATUS)) counts[value] = 0;
  for (const row of byStatus) {
    counts[row._id] = row.count;
    counts.all += row.count;
  }

  if (status !== 'all') filter.status = status;

  const [items, total] = await Promise.all([
    PunchCorrection.find(filter)
      .populate('userId', 'name employeeCode')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    PunchCorrection.countDocuments(filter),
  ]);
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)), counts };
}
