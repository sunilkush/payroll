// Demo data: do companies, unke admin, staff, pichhle + chalu mahine ki attendance, leaves aur payroll.
//
//   npm run seed:demo
//
// - Ye asli jaisa dikhne wala NAKLI data hai (naam, salary, bank sab banawati), app ko bhara hua
//   dikhane / try karne ke liye. Apna asli data admin login se daalein.
// - Sirf jodta hai, kuch mitata nahi. Demo company pehle se ho to kuch nahi karta.
// - Saare demo users ka password neeche DEMO_PASSWORD hai (script ke end mein print hota hai).
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { Attendance } from '../models/Attendance.js';
import { Company } from '../models/Company.js';
import { LeaveBalance } from '../models/LeaveBalance.js';
import { User } from '../models/User.js';
import { distanceInMeters } from '../services/geoService.js';
import { applyLeave, approveLeave, creditCompany, rejectLeave } from '../services/leaveService.js';
import { finalizePayroll, generatePayroll } from '../services/salaryService.js';
import { ROLES } from '../utils/constants.js';
import { currentMonth, datesBetween, daysOfMonth, todayStr, weekdayOf } from '../utils/dateUtil.js';
import { runWithTenant } from '../utils/tenantContext.js';

const DEMO_PASSWORD = 'Demo@1234';

// Har baar same data bane (asli random nahi)
let randomState = 20261004;
const random = () => {
  randomState = (randomState * 1664525 + 1013904223) % 4294967296;
  return randomState / 4294967296;
};
const between = (min, max) => Math.floor(min + random() * (max - min + 1));
const pad = (number) => String(number).padStart(2, '0');

const today = todayStr();
const month = currentMonth();
const year = Number(month.slice(0, 4));
const prevMonth = new Date(Date.UTC(year, Number(month.slice(5)) - 2, 1)).toISOString().slice(0, 7);
const addDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

// [name, code, joiningDate, basic, hra, special, pf, esi]
const COMPANIES = [
  {
    name: 'Shree Balaji Engineering Works Pvt Ltd',
    address: 'Plot 214, Udyog Vihar Phase 4, Gurugram, Haryana 122015',
    location: { name: 'Udyog Vihar Plant', lat: 28.4996, lng: 77.0847, radius: 120 },
    holiday: 'Company Foundation Day',
    admin: { name: 'Rajesh Kumar Sharma', email: 'rajesh.sharma@balajiengg.example', phone: '9810012345' },
    domain: 'balajiengg.example',
    staff: [
      ['Ravi Kumar', 'BE001', '2023-04-10', 15000, 6000, 1500, true, true],
      ['Sunita Devi', 'BE002', '2022-11-01', 12000, 5000, 1000, true, true],
      ['Mohammed Imran Ansari', 'BE003', '2021-07-15', 32000, 16000, 6000, true, false],
      ['Pooja Yadav', 'BE004', '2024-02-05', 14000, 5500, 1200, true, true],
      ['Amit Singh Rathore', 'BE005', '2020-01-20', 26000, 13000, 4000, true, false],
      ['Neha Gupta', 'BE006', '2025-06-16', 13000, 5200, 800, true, true],
      ['Sandeep Malik', 'BE007', '2023-09-01', 16500, 6600, 1900, true, false],
      ['Kavita Rani', 'BE008', '2024-08-12', 11500, 4600, 900, true, true],
      ['Deepak Verma', 'BE009', `${prevMonth}-15`, 15500, 6200, 1300, true, true], // pichhle mahine beech mein join hua
      ['Anil Kumar Jangra', 'BE010', '2019-03-11', 21000, 10500, 3500, true, false],
    ],
  },
  {
    name: 'Om Sai Traders',
    address: 'Shop 18, Sector 24 Market, Faridabad, Haryana 121005',
    location: { name: 'Sector 24 Shop', lat: 28.367, lng: 77.308, radius: 80 },
    holiday: 'Annual Stock Taking',
    admin: { name: 'Priya Agarwal', email: 'priya.agarwal@omsaitraders.example', phone: '9871054321' },
    domain: 'omsaitraders.example',
    staff: [
      ['Vikas Chauhan', 'OS001', '2022-05-02', 12000, 4800, 1200, false, true],
      ['Rekha Sharma', 'OS002', '2023-01-16', 11000, 4400, 600, false, true],
      ['Manoj Tiwari', 'OS003', '2021-10-04', 14000, 5600, 1400, false, true],
      ['Seema Khan', 'OS004', '2025-03-03', 10500, 4200, 300, false, true],
    ],
  },
];

const emailOf = (name, domain) => `${name.toLowerCase().split(' ').slice(0, 2).join('.')}@${domain}`;

// Office ke paas ka ek punch (thoda idhar-udhar, asli GPS jaisa)
function punchAt(date, hour, minuteFrom, minuteTo, location) {
  const point = {
    lat: location.lat + (random() - 0.5) * 0.0005,
    lng: location.lng + (random() - 0.5) * 0.0005,
  };
  return {
    time: new Date(`${date}T${pad(hour)}:${pad(between(minuteFrom, minuteTo))}:00+05:30`),
    ...point,
    accuracy: between(8, 30),
    distance: Math.round(distanceInMeters(point, location)),
    locationName: location.name,
    ip: `192.168.1.${between(20, 200)}`,
    userAgent: 'Demo seed',
  };
}

async function seedCompany(config) {
  const holidayDate = `${prevMonth}-${pad(between(8, 20))}`;
  const company = await Company.create({
    name: config.name,
    address: config.address,
    locations: [config.location],
    holidays: [{ date: holidayDate, name: config.holiday }],
    settings: { leaveEnabled: true, allowPastLeave: true, pfEnabled: true, esiEnabled: true },
  });
  const admin = await User.create({ ...config.admin, password: DEMO_PASSWORD, role: ROLES.ADMIN, companyId: company._id });

  const staff = [];
  for (const [name, employeeCode, joiningDate, basic, hra, special, pfApplicable, esiApplicable] of config.staff) {
    const user = await User.create({
      companyId: company._id,
      role: ROLES.STAFF,
      name,
      email: emailOf(name, config.domain),
      phone: `98${between(10000000, 99999999)}`,
      password: DEMO_PASSWORD,
      employeeCode,
      joiningDate,
      salaryStructure: { basic, hra, special, other: 0 },
      pfApplicable,
      esiApplicable,
      uan: pfApplicable ? `1011${between(10000000, 99999999)}` : '',
      esicNo: esiApplicable ? `20${between(10000000, 99999999)}` : '',
      bankDetails: { accountNo: `3${between(1000000000, 9999999999)}`, ifsc: 'SBIN0001234', bankName: 'State Bank of India' },
    });
    // Attendance pichhle mahine ki 1 tarikh (ya joining) se track ho, isliye "account bana" bhi tabhi ka dikhao
    const trackedFrom = joiningDate > `${prevMonth}-01` ? joiningDate : `${prevMonth}-01`;
    await User.collection.updateOne({ _id: user._id }, { $set: { createdAt: new Date(`${trackedFrom}T03:30:00Z`) } });
    user.createdAt = new Date(`${trackedFrom}T03:30:00Z`);
    staff.push({ user, trackedFrom });
  }

  // Is saal ke har mahine ka CL/EL credit (January se chalu mahine tak)
  for (let m = 1; m <= Number(month.slice(5)); m += 1) await creditCompany(company, `${year}-${pad(m)}`);
  if (prevMonth.slice(0, 4) !== String(year)) await creditCompany(company, prevMonth);

  // Kaam ke din: pichhle mahine ki 1 se kal tak, Sunday aur holiday chhod kar
  const isWorking = (date) => date !== holidayDate && weekdayOf(date) !== 0;
  const allDays = datesBetween(`${prevMonth}-01`, addDays(today, -1)).filter(isWorking);
  const prevWorking = daysOfMonth(prevMonth).filter(isWorking);

  await runWithTenant(company._id, async () => {
    // Leaves: pehle 3 staff ki pichhle mahine mein approved leave, ek ki reject, do ki aane wali pending
    const leaveDays = new Map(); // userId -> Set(date)
    const takeLeave = async (index, type, from, to, reason, action) => {
      const { user } = staff[index];
      const { leave } = await applyLeave(user, { type, fromDate: from, toDate: to, reason });
      if (action === 'approve') {
        await approveLeave(leave._id, admin, 'Approved');
        const days = leaveDays.get(String(user._id)) ?? new Set();
        datesBetween(from, to).forEach((date) => days.add(date));
        leaveDays.set(String(user._id), days);
      }
      if (action === 'reject') await rejectLeave(leave._id, admin, 'Month-end dispatch, please plan next week');
    };

    await takeLeave(0, 'CL', prevWorking[3], prevWorking[3], 'Personal work at home', 'approve');
    if (staff[1]) await takeLeave(1, 'EL', prevWorking[9], prevWorking[10], 'Going to native village for a family function', 'approve');
    if (staff[3]) await takeLeave(3, 'CL', prevWorking[14], prevWorking[14], 'Not feeling well', 'approve');
    if (staff[2]) await takeLeave(2, 'CL', prevWorking[18], prevWorking[18], 'Bank and passport office work', 'reject');

    // Attendance: leave ke din chhod kar, ~4% din absent, kabhi-kabhi punch out bhoola
    const records = [];
    for (const { user, trackedFrom } of staff) {
      const onLeave = leaveDays.get(String(user._id)) ?? new Set();
      for (const date of allDays) {
        if (date < trackedFrom || onLeave.has(date) || random() < 0.04) continue;
        const missed = random() < 0.03;
        records.push({
          companyId: company._id,
          userId: user._id,
          date,
          punchIn: punchAt(date, 9, 5, 50, config.location),
          ...(missed ? { missedPunchOut: true } : { punchOut: punchAt(date, 18, 0, 55, config.location) }),
        });
      }
    }
    await Attendance.insertMany(records);

    // Aane wali pending requests (admin ke approve karne ke liye)
    const upcoming = datesBetween(addDays(today, 2), addDays(today, 20)).filter(
      (date) => isWorking(date) && date.startsWith(String(year))
    );
    if (upcoming.length > 4) {
      if (staff[4]) await takeLeave(4, 'EL', upcoming[2], upcoming[3], "Sister's wedding");
      if (staff[5]) await takeLeave(5, 'CL', upcoming[0], upcoming[0], 'Doctor appointment');
    }

    // Payroll: pichhla mahina final, chalu mahina draft
    await generatePayroll(prevMonth, admin);
    await finalizePayroll(prevMonth);
    await generatePayroll(month, admin);

    return records.length;
  });

  // Beeti dates ki leave sirf seed ke liye kholi thi
  await Company.updateOne({ _id: company._id }, { $set: { 'settings.allowPastLeave': false } });

  return { company, admin, staff };
}

async function seed() {
  if (env.isProduction && !process.argv.includes('--force')) {
    throw new Error('Production mein demo data nahi daalte. Sach mein chahiye to: npm run seed:demo -- --force');
  }
  await connectDB();

  const existing = await Company.findOne({ name: { $in: COMPANIES.map((c) => c.name) } });
  if (existing) {
    console.log(`Demo data pehle se hai ("${existing.name}"). Kuch nahi badla.`);
    return;
  }

  console.log(`Demo data daal rahe hain (${prevMonth} aur ${month})...\n`);
  for (const config of COMPANIES) {
    const { company, admin, staff } = await seedCompany(config);
    const [attendance, balances] = await Promise.all([
      Attendance.countDocuments({ companyId: company._id }),
      LeaveBalance.countDocuments({ companyId: company._id }),
    ]);
    console.log(`${company.name}`);
    console.log(`  Admin:  ${admin.email}`);
    console.log(`  Staff:  ${staff.length} (jaise ${staff[0].user.email})`);
    console.log(`  Attendance records: ${attendance}, leave balances: ${balances}\n`);
  }
  console.log(`Saare demo users ka password: ${DEMO_PASSWORD}`);
}

seed()
  .catch((err) => {
    console.error('Demo seed fail:', err.message);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
