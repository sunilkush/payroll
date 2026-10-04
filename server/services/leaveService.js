import { Attendance } from '../models/Attendance.js';
import { Company } from '../models/Company.js';
import { Leave } from '../models/Leave.js';
import { LeaveBalance } from '../models/LeaveBalance.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { LEAVE_STATUS, ROLES } from '../utils/constants.js';
import { currentMonth, datesBetween, todayStr, weekdayOf } from '../utils/dateUtil.js';
import { getTenantId } from '../utils/tenantContext.js';

const MAX_RANGE_DAYS = 90;

async function getCompanyOrThrow() {
  const company = await Company.findById(getTenantId());
  if (!company) throw new ApiError(404, 'Company nahi mili.');
  return company;
}

// Staff ke saare leave actions se pehle: admin ne Settings mein leave management ON kiya ho.
async function getLeaveCompanyOrThrow() {
  const company = await getCompanyOrThrow();
  if (!company.settings.leaveEnabled) {
    throw new ApiError(403, 'Aapki company mein leave management band hai. Admin se contact karein.');
  }
  return company;
}

// ---------- Balance ----------

// Us saal ka balance record laata hai; na ho to banata hai. Naya saal shuru hone par
// CL lapse ho jaati hai (0 se shuru) aur EL limit tak carry forward hoti hai.
// companyId yahan khud dete hain kyunki cron tenant context ke bahar chalta hai.
async function ensureBalance(user, year, company) {
  const existing = await LeaveBalance.findOne({ userId: user._id, year });
  if (existing) return existing;

  const previous = await LeaveBalance.findOne({ userId: user._id, year: year - 1 });
  const carriedEl = previous ? Math.min(previous.EL.available, company.settings.elCarryForwardMax) : 0;
  try {
    return await LeaveBalance.create({
      companyId: user.companyId,
      userId: user._id,
      year,
      EL: { available: carriedEl },
    });
  } catch (err) {
    if (err.code === 11000) return LeaveBalance.findOne({ userId: user._id, year });
    throw err;
  }
}

// Ek staff ko ek mahine ka credit. lastCreditedMonth ki wajah se dobara chalane par double nahi lagta.
export async function creditUser(user, company, month = currentMonth()) {
  if (!company.settings.leaveEnabled) return false;
  const year = Number(month.slice(0, 4));
  await ensureBalance(user, year, company);
  const result = await LeaveBalance.updateOne(
    // Sirf tab jab ye mahina (ya is ke baad ka) pehle credit na hua ho.
    { userId: user._id, year, $or: [{ lastCreditedMonth: null }, { lastCreditedMonth: { $lt: month } }] },
    {
      $inc: { 'CL.available': company.settings.clPerMonth, 'EL.available': company.settings.elPerMonth },
      $set: { lastCreditedMonth: month },
    }
  );
  return result.modifiedCount === 1;
}

export async function creditCompany(company, month = currentMonth()) {
  if (!company.settings.leaveEnabled) return 0;
  const staff = await User.find({ companyId: company._id, role: ROLES.STAFF, isActive: true });
  let credited = 0;
  for (const user of staff) {
    if (await creditUser(user, company, month)) credited += 1;
  }
  return credited;
}

// Cron ke liye: jin active companies mein leave ON hai unke active staff ko is mahine ka credit.
export async function creditMonthlyLeaves(month = currentMonth()) {
  let credited = 0;
  for await (const company of Company.find({ isActive: true, 'settings.leaveEnabled': true }).cursor()) {
    credited += await creditCompany(company, month);
  }
  return credited;
}

export async function getBalance(user) {
  const company = await getLeaveCompanyOrThrow();
  return ensureBalance(user, Number(todayStr().slice(0, 4)), company);
}

// available/pending/used ke beech days ghumata hai. changes: { available: -2, pending: 2 }
function moveDays(leave, changes) {
  const inc = {};
  for (const [field, days] of Object.entries(changes)) inc[`${leave.type}.${field}`] = days;
  return LeaveBalance.updateOne({ userId: leave.userId, year: leave.year }, { $inc: inc });
}

// ---------- Apply ----------

export async function applyLeave(user, { type, fromDate, toDate, reason }) {
  const company = await getLeaveCompanyOrThrow();

  if (toDate < fromDate) throw new ApiError(400, 'To date, from date se pehle nahi ho sakti.');
  if (fromDate.slice(0, 4) !== toDate.slice(0, 4)) {
    throw new ApiError(400, 'Ek request ek hi saal ke andar honi chahiye. Do alag requests daalein.');
  }
  if (!company.settings.allowPastLeave && fromDate < todayStr()) {
    throw new ApiError(400, 'Beeti hui dates ki leave apply nahi ho sakti.');
  }

  const dates = datesBetween(fromDate, toDate);
  if (dates.length > MAX_RANGE_DAYS) {
    throw new ApiError(400, `Ek request mein ${MAX_RANGE_DAYS} din se zyada nahi ho sakte.`);
  }
  // Week off aur holiday pehle se paid hain, isliye leave mein nahi ginte.
  const holidays = new Set(company.holidays.map((holiday) => holiday.date));
  const workingDates = dates.filter(
    (date) => !holidays.has(date) && !company.settings.weekOffDays.includes(weekdayOf(date))
  );
  const days = workingDates.length;
  if (!days) throw new ApiError(400, 'In dates mein koi working day nahi hai.');

  const overlapping = await Leave.exists({
    userId: user._id,
    status: { $in: [LEAVE_STATUS.PENDING, LEAVE_STATUS.APPROVED] },
    fromDate: { $lte: toDate },
    toDate: { $gte: fromDate },
  });
  if (overlapping) throw new ApiError(409, 'In dates par aapki leave pehle se lagi hai.');

  if (await Attendance.exists({ userId: user._id, date: { $in: workingDates } })) {
    throw new ApiError(400, 'In dates mein se kisi din aapki attendance lag chuki hai.');
  }

  // Balance block: available se pending mein. Filter ($gte) ki wajah se balance kabhi minus nahi jata,
  // do request ek saath aayein to bhi.
  const year = Number(fromDate.slice(0, 4));
  await ensureBalance(user, year, company);
  const balance = await LeaveBalance.findOneAndUpdate(
    { userId: user._id, year, [`${type}.available`]: { $gte: days } },
    { $inc: { [`${type}.available`]: -days, [`${type}.pending`]: days } },
    { new: true }
  );
  if (!balance) {
    const current = await LeaveBalance.findOne({ userId: user._id, year });
    throw new ApiError(400, `${type} balance kam hai (available ${current[type].available}, chahiye ${days}).`);
  }

  try {
    const leave = await Leave.create({ userId: user._id, type, fromDate, toDate, year, days, reason });
    return { leave, balance };
  } catch (err) {
    await moveDays({ userId: user._id, year, type }, { available: days, pending: -days });
    throw err;
  }
}

// ---------- Approve / Reject / Cancel ----------

// Sirf PENDING leave par action hota hai. Status pehle atomically badalta hai, taaki do
// admin ek saath click karein to balance do baar na hile.
async function decide(id, { status, actor, note, extraFilter = {} }) {
  const leave = await Leave.findOneAndUpdate(
    { _id: id, status: LEAVE_STATUS.PENDING, ...extraFilter },
    { $set: { status, actionBy: actor._id, actionAt: new Date(), actionNote: note ?? '' } },
    { new: true }
  );
  if (!leave) {
    const exists = await Leave.exists({ _id: id, ...extraFilter });
    if (!exists) throw new ApiError(404, 'Leave nahi mili.');
    throw new ApiError(409, 'Is leave par pehle hi action ho chuka hai.');
  }

  const { days } = leave;
  await moveDays(
    leave,
    status === LEAVE_STATUS.APPROVED ? { pending: -days, used: days } : { pending: -days, available: days }
  );
  return leave;
}

export const approveLeave = (id, admin, note) =>
  decide(id, { status: LEAVE_STATUS.APPROVED, actor: admin, note });

export const rejectLeave = (id, admin, note) =>
  decide(id, { status: LEAVE_STATUS.REJECTED, actor: admin, note });

// Staff sirf apni pending leave cancel kar sakta hai.
export async function cancelLeave(id, user) {
  await getLeaveCompanyOrThrow();
  return decide(id, { status: LEAVE_STATUS.CANCELLED, actor: user, extraFilter: { userId: user._id } });
}

// ---------- List ----------

// Staff: sirf apni. Admin: company ki saari (staff ke naam ke saath).
// Leave OFF hone par bhi admin purani/pending requests dekh aur nipta sakta hai.
export async function listLeaves({ requester, status, page, limit }) {
  const filter = {};
  if (requester.role === ROLES.STAFF) {
    await getLeaveCompanyOrThrow();
    filter.userId = requester._id;
  }
  if (status !== 'all') filter.status = status;

  const [items, total] = await Promise.all([
    Leave.find(filter)
      .populate('userId', 'name employeeCode')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Leave.countDocuments(filter),
  ]);
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
