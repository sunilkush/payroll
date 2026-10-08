// Demo data: do companies, unke admin, staff, pichhle + chalu mahine ki attendance, leaves aur payroll.
// Pehli company mein Sales meetings bhi: clients, 2 sales manager, poori hui / chhooti / aaj ki / aane wali meetings.
//
//   npm run seed:demo
//
// - Ye asli jaisa dikhne wala NAKLI data hai (naam, salary, bank sab banawati), app ko bhara hua
//   dikhane / try karne ke liye. Apna asli data admin login se daalein.
// - Sirf jodta hai, kuch mitata nahi. Demo company pehle se ho to kuch nahi karta
//   (bas Sales ka demo data na ho to wo jod deta hai).
// - Saare demo users ka password neeche DEMO_PASSWORD hai (script ke end mein print hota hai).
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { Attendance } from '../models/Attendance.js';
import { Client } from '../models/Client.js';
import { Company } from '../models/Company.js';
import { LeaveBalance } from '../models/LeaveBalance.js';
import { Meeting } from '../models/Meeting.js';
import { User } from '../models/User.js';
import { distanceInMeters } from '../services/geoService.js';
import { applyLeave, approveLeave, creditCompany, rejectLeave } from '../services/leaveService.js';
import { buildQr } from '../services/qrService.js';
import { finalizePayroll, generatePayroll } from '../services/salaryService.js';
import { ROLES } from '../utils/constants.js';
import { currentMonth, datesBetween, daysOfMonth, toDateStr, todayStr, weekdayOf } from '../utils/dateUtil.js';
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

// ---------- Sales meetings (sirf pehli demo company) ----------

const SALES_CLIENTS = [
  { name: 'Sharma Auto Components Pvt Ltd', contactPerson: 'Mr. Vivek Sharma', phone: '9811045210', address: 'C-56, Sector 62, Noida, Uttar Pradesh 201301', lat: 28.6273, lng: 77.3725 },
  { name: 'Northern Forgings Ltd', contactPerson: 'Ms. Neha Bansal', phone: '9871230456', address: 'Plot 18, Sector 24, Faridabad, Haryana 121005', lat: 28.3706, lng: 77.3178 },
  { name: 'Kiran Packaging Industries', contactPerson: 'Mr. Kiran Mehta', phone: '9899011223', address: '412, IMT Manesar, Gurugram, Haryana 122052', lat: 28.3596, lng: 76.9379 },
];

// Client ki jagah ke paas ka check-in / check-out (thoda idhar-udhar, asli GPS jaisa)
function visitPunch(at, place) {
  const point = { lat: place.lat + (random() - 0.5) * 0.0006, lng: place.lng + (random() - 0.5) * 0.0006 };
  return {
    at,
    ...point,
    accuracy: between(8, 30),
    distance: Math.round(distanceInMeters(point, place)),
    locationStatus: 'VERIFIED',
    ip: `192.168.1.${between(20, 200)}`,
    userAgent: 'Demo seed',
  };
}

async function seedSales(company, admin, staffUsers) {
  await Company.updateOne({ _id: company._id }, { $set: { 'settings.salesEnabled': true } });
  const managers = staffUsers.slice(0, 2);
  await User.updateMany({ _id: { $in: managers.map((user) => user._id) } }, { $set: { isSalesManager: true } });
  const clients = await Client.insertMany(SALES_CLIENTS.map((client) => ({ ...client, companyId: company._id })));
  const grace = 30;
  const ist = (date, time) => new Date(`${date}T${time}:00+05:30`);
  const by = admin._id;

  // [client, manager, din (aaj se), start, end, status, extra]
  const done = (outcome, more = {}) => ({ outcome, clientInterested: outcome !== 'NOT_INTERESTED', ...more });
  const plan = [
    [0, 0, -6, '10:30', '11:30', 'COMPLETED', { result: done('DEAL_CLOSED', { requirement: '2,000 brackets per month', estimatedDealValue: 480000, remarks: 'PO expected this week.' }) }],
    [1, 1, -5, '11:00', '12:00', 'COMPLETED', { result: done('PROPOSAL_REQUIRED', { requirement: 'Forged flanges, 3 sizes', estimatedDealValue: 220000 }), followUp: { days: 2, notes: 'Send the revised quotation.' } }],
    [2, 0, -4, '15:00', '16:00', 'COMPLETED', { result: done('FOLLOW_UP_REQUIRED', { remarks: 'Decision maker was travelling.' }), followUp: { days: 0, notes: 'Call Mr. Mehta for the next visit date.' } }],
    [0, 1, -3, '10:00', '11:00', 'MISSED', {}],
    [1, 0, -2, '12:30', '13:30', 'COMPLETED', { result: done('NOT_INTERESTED', { remarks: 'Already tied up with another vendor for this year.' }) }],
    [2, 1, -1, '14:00', '15:00', 'CANCELLED', { cancelReason: 'Client postponed to next month.' }],
    [0, 0, 1, '11:00', '12:00', 'QR_SENT', {}],
    [1, 1, 2, '10:30', '11:30', 'SCHEDULED', {}],
  ];

  const meetings = plan.map(([clientIndex, managerIndex, dayOffset, start, end, status, extra]) => {
    const client = clients[clientIndex];
    const manager = managers[managerIndex % managers.length];
    const date = addDays(today, dayOffset);
    const startAt = ist(date, start);
    const endAt = ist(date, end);
    const meeting = new Meeting({
      companyId: company._id,
      clientId: client._id,
      salesManagerId: manager._id,
      contactPerson: client.contactPerson,
      contactPhone: client.phone,
      title: ['Quarterly review', 'New product demo', 'Rate contract discussion', 'Sample approval'][between(0, 3)],
      purpose: 'Discuss requirement and next order.',
      date,
      startAt,
      endAt,
      location: { name: client.name, address: client.address, lat: client.lat, lng: client.lng, radius: 150 },
      status,
      createdBy: by,
      cancelReason: extra.cancelReason,
      events: [{ type: 'CREATED', by, at: ist(addDays(date, -2), '10:00') }, { type: 'QR_GENERATED', by, at: ist(addDays(date, -2), '10:00') }],
    });
    meeting.qr = { ...buildQr(meeting._id, 1, endAt, grace), ...(status !== 'SCHEDULED' && { sentAt: ist(addDays(date, -1), '18:00') }) };
    if (status !== 'SCHEDULED') meeting.events.push({ type: 'QR_SENT', by, at: ist(addDays(date, -1), '18:00'), detail: 'share' });

    if (status === 'COMPLETED') {
      const inAt = new Date(startAt.getTime() + between(-8, 12) * 60000);
      const outAt = new Date(endAt.getTime() + between(-10, 20) * 60000);
      meeting.checkIn = visitPunch(inAt, client);
      meeting.checkOut = visitPunch(outAt, client);
      meeting.durationMinutes = Math.round((outAt - inAt) / 60000);
      meeting.result = extra.result;
      if (extra.followUp) {
        meeting.followUp = { at: ist(addDays(today, extra.followUp.days), '11:00'), notes: extra.followUp.notes, status: 'PENDING' };
      }
      meeting.events.push(
        { type: 'QR_SCANNED', by: manager._id, at: inAt },
        { type: 'CHECKED_IN', by: manager._id, at: inAt, detail: `${meeting.checkIn.distance} m away` },
        { type: 'CHECKED_OUT', by: manager._id, at: outAt, detail: `${meeting.checkOut.distance} m away` },
        { type: 'COMPLETED', by: manager._id, at: outAt, detail: extra.result.outcome }
      );
    }
    if (status === 'MISSED') meeting.events.push({ type: 'MISSED', at: new Date(endAt.getTime() + grace * 60000) });
    if (status === 'CANCELLED') meeting.events.push({ type: 'CANCELLED', by, at: ist(addDays(date, -1), '17:00'), detail: extra.cancelReason });
    return meeting;
  });

  // Aaj ki do meetings: ek abhi (check-in try karne ke liye khuli), ek 3 ghante baad
  for (const [index, startInMin] of [45, 180].entries()) {
    const client = clients[index];
    const startAt = new Date(Math.ceil((Date.now() + startInMin * 60000) / 900000) * 900000); // 15 minute par gol
    const endAt = new Date(startAt.getTime() + 60 * 60000);
    const meeting = new Meeting({
      companyId: company._id,
      clientId: client._id,
      salesManagerId: managers[0]._id,
      contactPerson: client.contactPerson,
      contactPhone: client.phone,
      title: index === 0 ? 'Order follow-up visit' : 'Annual rate review',
      date: toDateStr(startAt),
      startAt,
      endAt,
      location: { name: client.name, address: client.address, lat: client.lat, lng: client.lng, radius: 150 },
      status: index === 0 ? 'QR_SENT' : 'SCHEDULED',
      createdBy: by,
      events: [{ type: 'CREATED', by }, { type: 'QR_GENERATED', by }],
    });
    meeting.qr = { ...buildQr(meeting._id, 1, endAt, grace), ...(index === 0 && { sentAt: new Date() }) };
    meetings.push(meeting);
  }

  for (const meeting of meetings) await meeting.save();
  return { clients: clients.length, meetings: meetings.length, managers };
}

const printSales = ({ clients, meetings, managers }) => {
  console.log(`  Sales:  ${clients} clients, ${meetings} meetings`);
  console.log(`  Sales managers: ${managers.map((user) => user.email).join(', ')}\n`);
};

async function seed() {
  if (env.isProduction && !process.argv.includes('--force')) {
    throw new Error('Production mein demo data nahi daalte. Sach mein chahiye to: npm run seed:demo -- --force');
  }
  await connectDB();

  const existing = await Company.findOne({ name: { $in: COMPANIES.map((c) => c.name) } });
  if (existing) {
    // Purana demo data (Sales aane se pehle ka): sirf Sales ka hissa jod do.
    const first = await Company.findOne({ name: COMPANIES[0].name });
    if (first && !(await Client.exists({ companyId: first._id }))) {
      const admin = await User.findOne({ companyId: first._id, role: ROLES.ADMIN });
      const staffUsers = await User.find({ companyId: first._id, role: ROLES.STAFF, isActive: true }).sort({ employeeCode: 1 });
      console.log(`Demo data pehle se hai. "${first.name}" mein Sales meetings ka demo data jod rahe hain...`);
      printSales(await seedSales(first, admin, staffUsers));
      console.log(`Saare demo users ka password: ${DEMO_PASSWORD}`);
      return;
    }
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
    console.log(`  Attendance records: ${attendance}, leave balances: ${balances}${config === COMPANIES[0] ? '' : '\n'}`);
    if (config === COMPANIES[0]) printSales(await seedSales(company, admin, staff.map((item) => item.user)));
  }
  console.log(`Saare demo users ka password: ${DEMO_PASSWORD}`);
}

seed()
  .catch((err) => {
    console.error('Demo seed fail:', err.message);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
