import { Company } from '../models/Company.js';
import { Payroll } from '../models/Payroll.js';
import { ApiError } from '../utils/ApiError.js';
import { PAYROLL_STATUS, ROLES } from '../utils/constants.js';
import { currentMonth, daysOfMonth, toDateStr } from '../utils/dateUtil.js';
import { getTenantId } from '../utils/tenantContext.js';
import { getStaffMonthSummaries } from './attendanceService.js';
import { getGlobalSettings } from './globalSettingsService.js';
import { calculateEsi, calculatePf, contributionPeriodStart, round2 } from './statutoryService.js';

const COMPONENTS = ['basic', 'hra', 'special', 'other'];
const sum = (values) => round2(values.reduce((total, value) => total + value, 0));

// ---------- Calculation (pure) ----------

// Ek staff ki ek mahine ki salary.
//   Per Day Salary = Monthly Gross / 30        Payable Days = 30 - LOP Days
//   Earned Gross   = Per Day Salary x Payable Days
//   Net Salary     = Earned Gross - PF - ESI - Other deductions
// Har mahine 30 din fix hain (28/31 wale mahine mein bhi). Present, paid leave, week off
// aur holiday sab paid hain; sirf LOP (absent + joining se pehle ke din) katta hai.
export function computePayroll({ user, company, rates, lopDays, calendarDays, esiCoveredInPeriod, otherDeductions = 0 }) {
  const basis = rates.payrollDaysBasis;
  // Poora mahina LOP ho to 0 (warna February mein 30 - 28 = 2 din ki salary ban jati).
  const payableDays = lopDays >= calendarDays ? 0 : Math.max(0, basis - lopDays);

  const salaryStructure = {};
  const earnings = {};
  for (const key of COMPONENTS) {
    salaryStructure[key] = user.salaryStructure?.[key] ?? 0;
    earnings[key] = round2((salaryStructure[key] * payableDays) / basis);
  }
  salaryStructure.gross = sum(COMPONENTS.map((key) => salaryStructure[key]));
  earnings.gross = sum(COMPONENTS.map((key) => earnings[key]));

  // Company level aur staff level dono ON hon tabhi katta hai.
  const pf = calculatePf({
    enabled: company.settings.pfEnabled && user.pfApplicable,
    earnedBasic: earnings.basic,
    earnedGross: earnings.gross,
    capAtCeiling: company.settings.pfCapAtCeiling,
    rates: rates.pf,
  });
  const esi = calculateEsi({
    enabled: company.settings.esiEnabled && user.esiApplicable,
    monthlyGross: salaryStructure.gross,
    earnedGross: earnings.gross,
    coveredInPeriod: esiCoveredInPeriod,
    rates: rates.esi,
  });

  // Other deduction itna hi ho sakta hai jitni salary bachi ho (net minus mein nahi jata).
  const other = Math.min(otherDeductions, Math.max(0, round2(earnings.gross - pf.employee - esi.employee)));
  const deductions = { pf: pf.employee, esi: esi.employee, other };
  deductions.total = sum([deductions.pf, deductions.esi, deductions.other]);

  const employerContribution = {
    epf: pf.employerEpf,
    eps: pf.employerEps,
    edli: pf.edli,
    pfAdmin: pf.admin,
    esi: esi.employer,
  };
  employerContribution.total = sum(Object.values(employerContribution));

  return {
    payableDays,
    lopDays,
    salaryStructure,
    earnings,
    pfWage: pf.wage,
    esiCovered: esi.covered,
    deductions,
    employerContribution,
    netSalary: round2(earnings.gross - deductions.total),
  };
}

// ---------- Helpers ----------

async function getCompanyOrThrow() {
  const company = await Company.findById(getTenantId());
  if (!company) throw new ApiError(404, 'Company not found.');
  return company;
}

const staffSnapshot = (user) => ({
  name: user.name,
  employeeCode: user.employeeCode,
  joiningDate: user.joiningDate,
  uan: user.uan,
  esicNo: user.esicNo,
  bankName: user.bankDetails?.bankName,
  accountNo: user.bankDetails?.accountNo,
  ifsc: user.bankDetails?.ifsc,
});

function totalsOf(rows) {
  const total = (pick) => sum(rows.map(pick));
  return {
    earnedGross: total((row) => row.earnings.gross),
    pf: total((row) => row.deductions.pf),
    esi: total((row) => row.deductions.esi),
    other: total((row) => row.deductions.other),
    deductions: total((row) => row.deductions.total),
    netSalary: total((row) => row.netSalary),
    employerContribution: total((row) => row.employerContribution.total),
  };
}

const sortedRows = (period) => Payroll.find({ period }).sort({ 'staff.employeeCode': 1 });

// ---------- Generate ----------

// Mahine ki payroll banata (ya DRAFT ko dobara banata) hai. FINAL rows ko nahi chhedta.
// Chalu mahine ki payroll DRAFT ban sakti hai (bache hue din paid maane jaate hain), aane wale mahine ki nahi.
export async function generatePayroll(month, admin) {
  if (month > currentMonth()) throw new ApiError(400, 'Payroll cannot be generated for a future month.');

  const [{ company, rows }, rates, existing, coveredUserIds] = await Promise.all([
    getStaffMonthSummaries(month),
    getGlobalSettings(),
    Payroll.find({ period: month }),
    // Isi ESI contribution period ke pehle ke mahino mein jin par ESI kat chuka hai.
    Payroll.distinct('userId', {
      period: { $gte: contributionPeriodStart(month), $lt: month },
      esiCovered: true,
    }),
  ]);
  const existingByUser = new Map(existing.map((payroll) => [String(payroll.userId), payroll]));
  const esiCovered = new Set(coveredUserIds.map(String));
  const monthDates = daysOfMonth(month);

  for (const { user, summary } of rows) {
    const previous = existingByUser.get(String(user._id));
    if (previous?.status === PAYROLL_STATUS.FINAL) continue;

    // Naukri shuru hone se pehle ke din unpaid hain. Mahine ke baad join hua to payroll mein nahi aata.
    const employedFrom = toDateStr(user.joiningDate ?? user.createdAt);
    const notEmployed = monthDates.filter((date) => date < employedFrom).length;
    const skip =
      notEmployed === monthDates.length || (!user.isActive && summary.present + summary.leave === 0);
    if (skip) {
      if (previous) await Payroll.deleteOne({ _id: previous._id });
      continue;
    }

    const computed = computePayroll({
      user,
      company,
      rates,
      lopDays: summary.absent + notEmployed,
      calendarDays: monthDates.length,
      esiCoveredInPeriod: esiCovered.has(String(user._id)),
      otherDeductions: previous?.deductions.other ?? 0, // admin ka daala hua deduction bana rehta hai
    });

    await Payroll.findOneAndUpdate(
      { userId: user._id, period: month },
      {
        $set: {
          ...computed,
          month: Number(month.slice(5)),
          year: Number(month.slice(0, 4)),
          staff: staffSnapshot(user),
          attendance: { ...summary, notEmployed },
          status: PAYROLL_STATUS.DRAFT,
          generatedBy: admin._id,
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  return listPayroll(month);
}

// ---------- Read / update ----------

export async function listPayroll(month) {
  const rows = await sortedRows(month);
  return {
    month,
    rows,
    totals: totalsOf(rows),
    hasDraft: rows.some((row) => row.status === PAYROLL_STATUS.DRAFT),
    // Mahina poora hone ke baad hi final ho sakti hai.
    monthCompleted: month < currentMonth(),
  };
}

// DRAFT par admin "other deductions" (advance, fine waghera) aur remarks daal sakta hai.
export async function updatePayroll(id, { otherDeductions, remarks }) {
  const payroll = await Payroll.findById(id);
  if (!payroll) throw new ApiError(404, 'Payroll not found.');
  if (payroll.status === PAYROLL_STATUS.FINAL) throw new ApiError(409, 'Finalized payroll cannot be changed.');

  if (otherDeductions !== undefined) {
    const { pf, esi } = payroll.deductions;
    const maxOther = round2(payroll.earnings.gross - pf - esi);
    if (otherDeductions > maxOther) {
      throw new ApiError(400, `Other deduction cannot be more than ${maxOther} (net salary would go negative).`);
    }
    payroll.deductions.other = otherDeductions;
    payroll.deductions.total = sum([pf, esi, otherDeductions]);
    payroll.netSalary = round2(payroll.earnings.gross - payroll.deductions.total);
  }
  if (remarks !== undefined) payroll.remarks = remarks;

  await payroll.save();
  return payroll;
}

export async function finalizePayroll(month) {
  if (month >= currentMonth()) {
    throw new ApiError(400, 'Payroll can be finalized only after the month is over.');
  }
  const result = await Payroll.updateMany(
    { period: month, status: PAYROLL_STATUS.DRAFT },
    { $set: { status: PAYROLL_STATUS.FINAL, finalizedAt: new Date() } }
  );
  if (!result.modifiedCount) throw new ApiError(400, 'There is no draft payroll to finalize.');
  return listPayroll(month);
}

// Staff: sirf apni FINAL payrolls.
export const listMyPayrolls = (user) =>
  Payroll.find({ userId: user._id, status: PAYROLL_STATUS.FINAL }).sort({ period: -1 });

// Slip ke liye data. Admin company ki koi bhi slip dekh sakta hai (draft bhi);
// staff sirf apni aur sirf FINAL.
export async function getSlipData(id, requester) {
  const filter = { _id: id };
  if (requester.role === ROLES.STAFF) {
    filter.userId = requester._id;
    filter.status = PAYROLL_STATUS.FINAL;
  }
  const [payroll, company] = await Promise.all([Payroll.findOne(filter), getCompanyOrThrow()]);
  if (!payroll) throw new ApiError(404, 'Salary slip not found.');
  return { payroll, company };
}

export async function getExportData(month) {
  const [rows, company] = await Promise.all([sortedRows(month), getCompanyOrThrow()]);
  if (!rows.length) throw new ApiError(404, 'Payroll has not been generated for this month.');
  return { month, rows, totals: totalsOf(rows), company };
}
