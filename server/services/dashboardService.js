import { Attendance } from '../models/Attendance.js';
import { Company } from '../models/Company.js';
import { Leave } from '../models/Leave.js';
import { LeaveBalance } from '../models/LeaveBalance.js';
import { Meeting } from '../models/Meeting.js';
import { Payroll } from '../models/Payroll.js';
import { PunchCorrection } from '../models/PunchCorrection.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import {
  ATTENDANCE_STATUS,
  CORRECTION_STATUS,
  FOLLOW_UP_STATUS,
  LEAVE_STATUS,
  MEETING_OPEN_STATUSES,
  MEETING_STATUS,
  PAYROLL_STATUS,
  PLAN_REQUEST_STATUS,
  ROLES,
} from '../utils/constants.js';
import {
  addDays,
  currentMonth,
  datesBetween,
  lastMonths,
  monthLabel,
  shortMonthLabel,
  toDateStr,
  todayStr,
  weekdayOf,
  zonedTime,
} from '../utils/dateUtil.js';
import { holidayOn, holidaysFor } from '../utils/holidays.js';
import { getTenantId } from '../utils/tenantContext.js';
import { getMonthly } from './attendanceService.js';
import { planLabel } from './planService.js';

// Dashboards ke liye sirf padhne wala data: KPI (pichhle period se tulna ke saath), charts ke
// series, aaj ki list, aane wali cheezein aur notifications. Yahan kuch likha / badla nahi jata.

const TREND_MONTHS = 6;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : null);
// Pichhle value se kitna % badla; pichhla 0/na ho to null (tulna ka matlab nahi)
const changePercent = (current, previous) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null;

async function getCompanyOrThrow() {
  const company = await Company.findById(getTenantId());
  if (!company) throw new ApiError(404, 'Company not found.');
  return company;
}

// user do to us staff ki branch ki holiday bhi; na do (admin) to sirf saari branches wali.
function dayTypeOf(company, date, user) {
  if (holidayOn(company, date, user)) return 'HOLIDAY';
  return company.settings.weekOffDays.includes(weekdayOf(date)) ? 'WEEK_OFF' : 'WORKING';
}

// Staff ki attendance kis din se ginte hain (attendanceService.buildMonth jaisa hi rule)
function trackedFrom(user) {
  const joining = user.joiningDate ? toDateStr(user.joiningDate) : '';
  const created = toDateStr(user.createdAt);
  return joining > created ? joining : created;
}

// Admin: saari holidays. Staff (user diya): sirf jo uski branch par lagti hain.
const upcomingHolidays = (company, today, user) =>
  (user ? holidaysFor(company, user) : company.holidays)
    .filter((holiday) => holiday.date >= today)
    .map((holiday) => ({ date: holiday.date, type: 'HOLIDAY', title: holiday.name, subtitle: 'Holiday' }));

const byDate = (a, b) => a.date.localeCompare(b.date);

// ================= Admin =================

export async function getAdminDashboard({ days }) {
  const company = await getCompanyOrThrow();
  const today = todayStr();
  const month = currentMonth();
  const months = lastMonths(TREND_MONTHS, month);
  // KPI ki sparkline ke liye kam se kam 14 din chahiye, chart `days` din dikhata hai
  const start = addDays(today, -(Math.max(days, 14) - 1));
  const weekAgo = new Date(Date.now() - WEEK_MS);

  const [staff, presentByDate, approvedLeaves, todayRecords, payrollByPeriod, pendingLeaves, pendingCount, pendingThisWeek, recentPunches, recentLeaves] =
    await Promise.all([
      User.find({ role: ROLES.STAFF }).select('name employeeCode isActive joiningDate createdAt').sort({ name: 1 }),
      Attendance.aggregate([
        { $match: { date: { $gte: start, $lte: today } } },
        { $group: { _id: '$date', present: { $sum: 1 } } },
      ]),
      Leave.find({ status: LEAVE_STATUS.APPROVED, toDate: { $gte: start } }).populate('userId', 'name'),
      Attendance.find({ date: today }),
      Payroll.aggregate([
        { $match: { period: { $gte: months[0], $lte: month } } },
        {
          $group: {
            _id: '$period',
            net: { $sum: '$netSalary' },
            deductions: { $sum: '$deductions.total' },
            employer: { $sum: '$employerContribution.total' },
            drafts: { $sum: { $cond: [{ $eq: ['$status', PAYROLL_STATUS.DRAFT] }, 1, 0] } },
          },
        },
      ]),
      Leave.find({ status: LEAVE_STATUS.PENDING }).populate('userId', 'name employeeCode').sort({ createdAt: -1 }).limit(5),
      Leave.countDocuments({ status: LEAVE_STATUS.PENDING }),
      Leave.countDocuments({ status: LEAVE_STATUS.PENDING, createdAt: { $gte: weekAgo } }),
      Attendance.find({ date: { $gte: addDays(today, -1) } }).populate('userId', 'name').sort({ updatedAt: -1 }).limit(8),
      Leave.find({ updatedAt: { $gte: weekAgo } }).populate('userId', 'name').sort({ updatedAt: -1 }).limit(8),
    ]);

  const activeStaff = staff.filter((user) => user.isActive);
  const starts = new Map(activeStaff.map((user) => [String(user._id), trackedFrom(user)]));

  // ---- Attendance: har din kitne present / leave par / kul
  const presentMap = new Map(presentByDate.map((row) => [row._id, row.present]));
  const leaveDates = new Map(); // date -> kitne staff leave par
  for (const leave of approvedLeaves) {
    for (const date of datesBetween(leave.fromDate > start ? leave.fromDate : start, leave.toDate)) {
      leaveDates.set(date, (leaveDates.get(date) ?? 0) + 1);
    }
  }
  const allDays = datesBetween(start, today).map((date) => {
    const dayType = dayTypeOf(company, date);
    const total = [...starts.values()].filter((from) => from <= date).length;
    const present = presentMap.get(date) ?? 0;
    return {
      date,
      dayType,
      present,
      onLeave: dayType === 'WORKING' ? leaveDates.get(date) ?? 0 : 0,
      total,
      // Week off / holiday ka rate nahi hota (chart mein gap)
      rate: dayType === 'WORKING' ? percent(present, total) : null,
    };
  });
  const workingDays = allDays.filter((day) => day.rate !== null);
  const latest = workingDays.at(-1);
  const beforeLatest = workingDays.at(-2);

  // ---- Aaj ki list (active staff)
  const recordByUser = new Map(todayRecords.map((record) => [String(record.userId), record]));
  const onLeaveToday = new Set(
    approvedLeaves.filter((leave) => leave.fromDate <= today && leave.toDate >= today).map((leave) => String(leave.userId?._id))
  );
  const todayType = dayTypeOf(company, today);
  const todayAttendance = activeStaff.map((user) => {
    const record = recordByUser.get(String(user._id));
    let status = todayType === 'WORKING' ? ATTENDANCE_STATUS.NOT_MARKED : todayType;
    if (onLeaveToday.has(String(user._id)) && todayType === 'WORKING') status = ATTENDANCE_STATUS.LEAVE;
    if (record) status = record.status || ATTENDANCE_STATUS.PRESENT;
    return {
      staff: { _id: user._id, name: user.name, employeeCode: user.employeeCode },
      status,
      punchIn: record?.punchIn.time ?? null,
      punchOut: record?.punchOut?.time ?? null,
      missedPunchOut: record?.missedPunchOut ?? false,
      locationName: record?.punchIn.locationName ?? null,
    };
  });
  const countStatus = (status) => todayAttendance.filter((row) => row.status === status).length;

  // ---- Payroll: mahine-wise kul
  const payrollMap = new Map(payrollByPeriod.map((row) => [row._id, row]));
  const round2 = (value) => Math.round((value ?? 0) * 100) / 100;
  const payrollTrend = months.map((period) => {
    const row = payrollMap.get(period);
    return {
      period,
      label: shortMonthLabel(period),
      net: round2(row?.net),
      deductions: round2(row?.deductions),
      employer: round2(row?.employer),
      generated: Boolean(row),
    };
  });
  const generated = payrollTrend.filter((row) => row.generated);
  const latestPayroll = generated.at(-1);
  const previousPayroll = generated.at(-2);

  // ---- Headcount: har mahine ke end tak kitne staff jud chuke the
  const headcount = months.map((period) => ({
    label: shortMonthLabel(period),
    value: staff.filter((user) => toDateStr(user.joiningDate ?? user.createdAt) <= `${period}-31`).length,
  }));

  // ---- Aane wala: holidays + approved leaves
  const upcomingLeaves = approvedLeaves
    .filter((leave) => leave.toDate >= today && leave.userId)
    .map((leave) => ({
      date: leave.fromDate > today ? leave.fromDate : today,
      type: 'LEAVE',
      title: `${leave.userId.name} on leave`,
      subtitle: `${leave.type} · ${leave.days} day(s)`,
    }));
  const upcoming = [...upcomingHolidays(company, today), ...upcomingLeaves].sort(byDate).slice(0, 6);

  // ---- Haal ki activity: punch aur leave ki ghatnayein, sabse nayi pehle
  const activity = [];
  for (const record of recentPunches) {
    const name = record.userId?.name ?? 'Staff';
    activity.push({ at: record.punchIn.time, type: 'PUNCH_IN', text: `${name} punched in`, detail: record.punchIn.locationName });
    if (record.punchOut) activity.push({ at: record.punchOut.time, type: 'PUNCH_OUT', text: `${name} punched out` });
  }
  for (const leave of recentLeaves) {
    const name = leave.userId?.name ?? 'Staff';
    const what = `${leave.days} day(s) ${leave.type}`;
    if (leave.status === LEAVE_STATUS.PENDING) {
      activity.push({ at: leave.createdAt, type: 'LEAVE_APPLIED', text: `${name} applied for ${what}` });
    } else {
      activity.push({
        at: leave.actionAt ?? leave.updatedAt,
        type: `LEAVE_${leave.status}`,
        text: `${name}'s leave (${what}) was ${leave.status.toLowerCase()}`,
      });
    }
  }
  activity.sort((a, b) => new Date(b.at) - new Date(a.at));

  return {
    company: { name: company.name, locationsCount: company.locations.length, leaveEnabled: company.settings.leaveEnabled },
    today: {
      date: today,
      dayType: todayType,
      totalStaff: activeStaff.length,
      present: countStatus(ATTENDANCE_STATUS.PRESENT),
      onLeave: countStatus(ATTENDANCE_STATUS.LEAVE),
      notMarked: countStatus(ATTENDANCE_STATUS.NOT_MARKED),
    },
    kpis: {
      staff: {
        value: activeStaff.length,
        newThisMonth: staff.filter((user) => toDateStr(user.joiningDate ?? user.createdAt).startsWith(month)).length,
        series: headcount,
      },
      attendance: {
        date: latest?.date ?? null,
        rate: latest?.rate ?? null,
        previousRate: beforeLatest?.rate ?? null,
        series: workingDays.slice(-14).map((day) => ({ label: day.date, value: day.rate })),
      },
      pendingLeaves: { value: pendingCount, newThisWeek: pendingThisWeek },
      payroll: latestPayroll
        ? {
            period: latestPayroll.period,
            label: monthLabel(latestPayroll.period),
            value: latestPayroll.net,
            previous: previousPayroll?.net ?? null,
            changePercent: changePercent(latestPayroll.net, previousPayroll?.net ?? 0),
            status: payrollMap.get(latestPayroll.period).drafts ? PAYROLL_STATUS.DRAFT : PAYROLL_STATUS.FINAL,
            series: generated.map((row) => ({ label: row.label, value: row.net })),
          }
        : null,
    },
    attendanceTrend: allDays.slice(-days),
    payrollTrend,
    todayAttendance,
    pendingLeaves,
    upcoming,
    activity: activity.slice(0, 8),
  };
}

// ================= Staff =================

export async function getStaffDashboard(user) {
  const company = await getCompanyOrThrow();
  const today = todayStr();
  const month = currentMonth();
  const months = lastMonths(TREND_MONTHS, month);

  const [monthlyData, todayRecord, balance, payslips, myLeaves] = await Promise.all([
    Promise.all(months.map((period) => getMonthly({ requester: user, month: period }))),
    Attendance.findOne({ userId: user._id, date: today }),
    company.settings.leaveEnabled ? LeaveBalance.findOne({ userId: user._id, year: Number(today.slice(0, 4)) }) : null,
    Payroll.find({ userId: user._id, status: PAYROLL_STATUS.FINAL }).sort({ period: -1 }).limit(TREND_MONTHS),
    Leave.find({
      userId: user._id,
      status: { $in: [LEAVE_STATUS.PENDING, LEAVE_STATUS.APPROVED] },
      toDate: { $gte: today },
    }).sort({ fromDate: 1 }),
  ]);

  const monthly = monthlyData.map(({ month: period, summary }) => ({ period, label: shortMonthLabel(period), ...summary }));
  const rateOf = (summary) => percent(summary.present, summary.present + summary.absent + summary.leave);
  const thisMonth = monthly.at(-1);
  const lastMonth = monthly.at(-2);
  const slips = [...payslips].reverse();
  const latestSlip = slips.at(-1);
  const previousSlip = slips.at(-2);

  const upcomingLeaves = myLeaves.map((leave) => ({
    date: leave.fromDate > today ? leave.fromDate : today,
    type: 'LEAVE',
    title: `Your ${leave.type} leave`,
    subtitle: `${leave.days} day(s) · ${leave.status === LEAVE_STATUS.PENDING ? 'Waiting for approval' : 'Approved'}`,
  }));

  return {
    company: { name: company.name, leaveEnabled: company.settings.leaveEnabled, hasLocation: company.locations.length > 0 },
    today: {
      date: today,
      dayType: dayTypeOf(company, today, user),
      punchIn: todayRecord?.punchIn.time ?? null,
      punchOut: todayRecord?.punchOut?.time ?? null,
      locationName: todayRecord?.punchIn.locationName ?? null,
    },
    kpis: {
      present: { value: thisMonth.present, previous: lastMonth.present },
      rate: { value: rateOf(thisMonth), previous: rateOf(lastMonth) },
      leave: balance
        ? {
            cl: balance.CL.available,
            el: balance.EL.available,
            pending: balance.CL.pending + balance.EL.pending,
          }
        : null,
      salary: latestSlip
        ? {
            period: latestSlip.period,
            label: monthLabel(latestSlip.period),
            value: latestSlip.netSalary,
            previous: previousSlip?.netSalary ?? null,
            changePercent: changePercent(latestSlip.netSalary, previousSlip?.netSalary ?? 0),
            series: slips.map((slip) => ({ label: shortMonthLabel(slip.period), value: slip.netSalary })),
          }
        : null,
    },
    monthly,
    salaryTrend: slips.map((slip) => ({
      period: slip.period,
      label: shortMonthLabel(slip.period),
      net: slip.netSalary,
      deductions: slip.deductions.total,
    })),
    // Is mahine ke aakhri 7 din jinme kuch dikhane ko hai, sabse naya pehle
    recentDays: monthlyData
      .at(-1)
      .days.filter((day) => day.status)
      .slice(-7)
      .reverse()
      .map((day) => ({
        date: day.date,
        weekday: day.weekday,
        status: day.status,
        note: day.note ?? null,
        punchIn: day.punchIn?.time ?? null,
        punchOut: day.punchOut?.time ?? null,
      })),
    upcoming: [...upcomingHolidays(company, today, user), ...upcomingLeaves].sort(byDate).slice(0, 6),
  };
}

// ================= Super Admin =================

export async function getSuperAdminDashboard() {
  const month = currentMonth();
  const months = lastMonths(TREND_MONTHS, month);

  const [companies, usersByCompany, newStaffThisMonth] = await Promise.all([
    Company.find().select('name address isActive createdAt').sort({ createdAt: -1 }).lean(),
    User.aggregate([
      { $match: { role: { $in: [ROLES.ADMIN, ROLES.STAFF] } } },
      { $group: { _id: { companyId: '$companyId', role: '$role' }, count: { $sum: 1 } } },
    ]),
    User.countDocuments({ role: ROLES.STAFF, createdAt: { $gte: new Date(`${month}-01T00:00:00Z`) } }),
  ]);

  const counts = new Map();
  for (const row of usersByCompany) {
    const key = String(row._id.companyId);
    const entry = counts.get(key) ?? { admins: 0, staff: 0 };
    if (row._id.role === ROLES.ADMIN) entry.admins = row.count;
    else entry.staff = row.count;
    counts.set(key, entry);
  }
  const rows = companies.map((company) => ({
    _id: company._id,
    name: company.name,
    address: company.address,
    isActive: company.isActive,
    createdAt: company.createdAt,
    admins: counts.get(String(company._id))?.admins ?? 0,
    staff: counts.get(String(company._id))?.staff ?? 0,
  }));

  const active = rows.filter((company) => company.isActive).length;
  const createdIn = (period) => rows.filter((company) => toDateStr(company.createdAt).startsWith(period)).length;
  const companiesTrend = months.map((period) => ({
    period,
    label: shortMonthLabel(period),
    created: createdIn(period),
    total: rows.filter((company) => toDateStr(company.createdAt) <= `${period}-31`).length,
  }));

  return {
    kpis: {
      companies: {
        value: rows.length,
        newThisMonth: createdIn(month),
        series: companiesTrend.map((row) => ({ label: row.label, value: row.total })),
      },
      active: { value: active, blocked: rows.length - active },
      staff: { value: rows.reduce((total, company) => total + company.staff, 0), newThisMonth: newStaffThisMonth },
      admins: { value: rows.reduce((total, company) => total + company.admins, 0) },
    },
    companiesTrend,
    status: { active, blocked: rows.length - active },
    topCompanies: [...rows].sort((a, b) => b.staff - a.staff).slice(0, 5),
    recentCompanies: rows.slice(0, 8),
    withoutAdmin: rows.filter((company) => company.admins === 0).map(({ _id, name }) => ({ _id, name })),
  };
}

// ================= Notifications (top bar ki ghanti) =================

// Har role ke liye "dhyan dene layak" cheezein. Ye DB mein save nahi hotin: har baar abhi ki
// haalat se banti hain, isliye kaam ho jane par apne aap hat jati hain.
// Sales follow-ups jo aaj tak (aaj shamil) due hain aur abhi PENDING hain. Sales module OFF ho to 0.
function dueFollowUps(company, filter, today) {
  if (!company.settings.salesEnabled) return 0;
  return Meeting.countDocuments({
    ...filter,
    'followUp.status': FOLLOW_UP_STATUS.PENDING,
    'followUp.at': { $lt: zonedTime(addDays(today, 1), '00:00') },
  });
}

export async function getNotifications(user) {
  const today = todayStr();
  const month = currentMonth();
  const items = [];
  const add = (id, tone, title, description, to) => items.push({ id, tone, title, description, to });

  if (user.role === ROLES.SUPER_ADMIN) {
    const [companies, admins] = await Promise.all([
      Company.find().select('name isActive').lean(),
      User.distinct('companyId', { role: ROLES.ADMIN }),
    ]);
    const withAdmin = new Set(admins.map(String));
    const noAdmin = companies.filter((company) => !withAdmin.has(String(company._id)));
    const blocked = companies.filter((company) => !company.isActive);
    if (noAdmin.length) {
      add('no-admin', 'warning', `${noAdmin.length} company(s) without an admin`, noAdmin.slice(0, 3).map((c) => c.name).join(', '), '/superadmin/companies');
    }
    const upgrades = await Company.countDocuments({ 'planRequest.status': PLAN_REQUEST_STATUS.PENDING });
    if (upgrades) {
      add('upgrade-requests', 'warning', `${upgrades} plan upgrade request(s) waiting`, 'Open the company to approve or reject.', '/superadmin/companies?status=upgrade');
    }
    if (blocked.length) {
      add('blocked', 'info', `${blocked.length} company(s) blocked`, 'Their users cannot log in.', '/superadmin/companies');
    }
    return items;
  }

  const company = await getCompanyOrThrow();

  if (user.role === ROLES.ADMIN) {
    const previousMonth = lastMonths(2, month)[0];
    const [pendingCorrections, pending, missed, staffCount, previousPayroll] = await Promise.all([
      PunchCorrection.countDocuments({ status: CORRECTION_STATUS.PENDING }),
      Leave.countDocuments({ status: LEAVE_STATUS.PENDING }),
      Attendance.countDocuments({ missedPunchOut: true, date: { $gte: addDays(today, -7) } }),
      User.countDocuments({ role: ROLES.STAFF, isActive: true }),
      Payroll.find({ period: previousMonth }).select('status'),
    ]);
    // Upgrade request ka faisla (pichhle 7 din mein)
    const request = company.planRequest;
    if (request?.decidedAt && request.decidedAt > new Date(Date.now() - WEEK_MS)) {
      const approved = request.status === PLAN_REQUEST_STATUS.APPROVED;
      add(
        'plan-request',
        approved ? 'success' : 'danger',
        approved ? `Your plan is now ${planLabel(request.plan)}` : 'Your upgrade request was not approved',
        request.decisionNote || (approved ? 'The new features are ready to use.' : 'Contact us for details.'),
        '/admin/billing'
      );
    }
    if (!company.locations.length) {
      add('no-location', 'danger', 'Office location is not set', 'Staff cannot punch in until you add one.', '/admin/settings');
    }
    if (pending) add('pending-leaves', 'warning', `${pending} leave request(s) waiting`, 'Approve or reject them.', '/admin/leaves');
    if (pendingCorrections) {
      add('pending-corrections', 'warning', `${pendingCorrections} punch correction request(s) waiting`, 'Approve or reject them.', '/admin/corrections');
    }
    if (staffCount && !previousPayroll.length) {
      add('payroll-missing', 'warning', `Payroll for ${monthLabel(previousMonth)} is not generated`, 'Generate and finalize it so staff get their slips.', '/admin/payroll');
    } else if (previousPayroll.some((row) => row.status === PAYROLL_STATUS.DRAFT)) {
      add('payroll-draft', 'warning', `Payroll for ${monthLabel(previousMonth)} is still a draft`, 'Finalize it so staff can see their slips.', '/admin/payroll');
    }
    if (missed) add('missed-punch', 'info', `${missed} missed punch-out(s) this week`, 'Check the attendance report.', '/admin/attendance');
    if (!staffCount) add('no-staff', 'info', 'No staff added yet', 'Add staff to start tracking attendance.', '/admin/staff');
    const overdue = await dueFollowUps(company, {}, today);
    if (overdue) add('follow-ups-due', 'warning', `${overdue} sales follow-up(s) due`, 'See which follow-ups are pending.', '/admin/follow-ups');
    if (company.settings.salesEnabled) {
      // Aaj ki meetings jinka QR abhi sales manager ko bheja nahi gaya
      const unsent = await Meeting.countDocuments({ date: today, status: MEETING_STATUS.SCHEDULED, endAt: { $gt: new Date() } });
      if (unsent) add('qr-not-sent', 'warning', `${unsent} meeting(s) today without a sent QR`, 'Share the QR with the sales manager.', '/admin/meetings');
    }
    return items;
  }

  // Staff
  const weekAgo = new Date(Date.now() - WEEK_MS);
  const [decidedCorrections, todayRecord, decided, latestSlip] = await Promise.all([
    PunchCorrection.find({
      userId: user._id,
      status: { $in: [CORRECTION_STATUS.APPROVED, CORRECTION_STATUS.REJECTED] },
      actionAt: { $gte: weekAgo },
    }).sort({ actionAt: -1 }).limit(3),
    Attendance.findOne({ userId: user._id, date: today }),
    company.settings.leaveEnabled
      ? Leave.find({
          userId: user._id,
          status: { $in: [LEAVE_STATUS.APPROVED, LEAVE_STATUS.REJECTED] },
          actionAt: { $gte: weekAgo },
        }).sort({ actionAt: -1 }).limit(3)
      : [],
    Payroll.findOne({ userId: user._id, status: PAYROLL_STATUS.FINAL, finalizedAt: { $gte: new Date(Date.now() - 2 * WEEK_MS) } }).sort({ period: -1 }),
  ]);
  if (dayTypeOf(company, today, user) === 'WORKING' && company.locations.length) {
    if (!todayRecord) add('punch-in', 'warning', 'You have not punched in today', 'Open the punch screen when you reach office.', '/staff/punch');
    else if (!todayRecord.punchOut) add('punch-out', 'info', 'Remember to punch out', 'Punch out before you leave office.', '/staff/punch');
  }
  for (const leave of decided) {
    const approved = leave.status === LEAVE_STATUS.APPROVED;
    add(`leave-${leave._id}`, approved ? 'success' : 'danger', `Your ${leave.type} leave was ${approved ? 'approved' : 'rejected'}`, `${leave.days} day(s) from ${leave.fromDate}`, '/staff/leaves');
  }
  for (const correction of decidedCorrections) {
    const approved = correction.status === CORRECTION_STATUS.APPROVED;
    add(`correction-${correction._id}`, approved ? 'success' : 'danger', `Your punch correction was ${approved ? 'approved' : 'rejected'}`, `For ${correction.date}`, '/staff/corrections');
  }
  const followUps = user.isSalesManager ? await dueFollowUps(company, { salesManagerId: user._id }, today) : 0;
  if (followUps) add('follow-ups-due', 'warning', `${followUps} follow-up(s) due`, 'Call or visit the client, then mark it done.', '/staff/follow-ups');
  if (user.isSalesManager && company.settings.salesEnabled) {
    const [openVisit, meetingsLeft] = await Promise.all([
      Meeting.findOne({ salesManagerId: user._id, status: MEETING_STATUS.CHECKED_IN }).populate('clientId', 'name'),
      Meeting.countDocuments({ salesManagerId: user._id, date: today, status: { $in: MEETING_OPEN_STATUSES }, endAt: { $gt: new Date() } }),
    ]);
    if (openVisit) {
      add('visit-open', 'info', `Visit in progress at ${openVisit.clientId?.name ?? 'a client'}`, 'Check out when the meeting ends.', `/staff/meetings/${openVisit._id}`);
    }
    if (meetingsLeft) add('meetings-today', 'info', `${meetingsLeft} client meeting(s) left today`, 'Scan the QR when you reach the client.', '/staff/meetings');
  }
  if (latestSlip) add(`slip-${latestSlip.period}`, 'success', `Salary slip for ${monthLabel(latestSlip.period)} is ready`, 'View or download it.', '/staff/salary');
  return items;
}
