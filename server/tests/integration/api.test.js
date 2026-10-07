import '../setup.js';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { after, before, describe, test } from 'node:test';
import { startTestServer } from '../helpers.js';
import mongoose from 'mongoose';
import { Attendance } from '../../models/Attendance.js';
import { Client } from '../../models/Client.js';
import { LeaveBalance } from '../../models/LeaveBalance.js';
import { Meeting } from '../../models/Meeting.js';
import { User } from '../../models/User.js';
import { markMissedPunchOuts } from '../../services/attendanceService.js';
import { addDays, daysOfMonth, todayStr, weekdayOf, zonedTime } from '../../utils/dateUtil.js';
import { runWithTenant } from '../../utils/tenantContext.js';

// Poora flow ek hi (khali) test database par, upar se neeche isi order mein chalta hai:
// auth -> companies -> staff -> attendance -> leave -> payroll.
// Beete dino wale checks pichhle mahine par hain, taaki test kisi bhi tarikh ko same result de.

const OFFICE = { lat: 28.4595, lng: 77.0266 };
const INSIDE = { lat: 28.4599, lng: 77.0266, accuracy: 20 }; // ~44m
const OUTSIDE = { lat: 28.4616, lng: 77.0266, accuracy: 20 }; // ~233m

const today = todayStr();
const month = today.slice(0, 7);
const prevMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 2, 1)).toISOString().slice(0, 7);
const prevYear = Number(prevMonth.slice(0, 4));
const prevDays = daysOfMonth(prevMonth);
const HOLIDAY = `${prevMonth}-02`;
// Pichhle mahine ke working days: Sunday aur holiday chhod kar
const workingDays = prevDays.filter((date) => date !== HOLIDAY && weekdayOf(date) !== 0);
const [absentDay1, absentDay2] = workingDays; // in do din attendance nahi hogi
const presentDays = workingDays.slice(2);
const sundays = prevDays.filter((date) => date !== HOLIDAY && weekdayOf(date) === 0);

let api;
let superAdmin;
const A = {}; // company A: { id, admin, staff, staffId, adminId }
const B = {};

const staffBody = (overrides = {}) => ({
  name: 'Ravi Kumar',
  password: 'Password@1',
  employeeCode: 'E1',
  joiningDate: `${prevMonth}-01`,
  salaryStructure: { basic: 15000, hra: 5000 },
  pfApplicable: true,
  esiApplicable: true,
  uan: '123456789012',
  bankDetails: { accountNo: '123456789012', ifsc: 'SBIN0001234', bankName: 'SBI' },
  ...overrides,
});

before(async () => {
  api = await startTestServer();
  await User.create({ name: 'Super Admin', email: 'super@test.local', password: 'SuperAdmin@1', role: 'SUPER_ADMIN' });
  superAdmin = await api.login('super@test.local', 'SuperAdmin@1');
});

after(async () => {
  await api.stop();
});

describe('auth', () => {
  test('super admin login ho gaya', () => {
    assert.ok(superAdmin);
  });

  test('galat password -> 401', async () => {
    const res = await api.call('/auth/login', { method: 'POST', body: { email: 'super@test.local', password: 'galat' } });
    assert.equal(res.status, 401);
  });

  test('validation -> 400 with field errors', async () => {
    const res = await api.call('/auth/login', { method: 'POST', body: { email: 'bad' } });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.errors.map((e) => e.field).sort(), ['email', 'password']);
  });

  test('bina token -> 401, kharab token -> 401', async () => {
    assert.equal((await api.call('/auth/me')).status, 401);
    assert.equal((await api.call('/auth/me', { token: `${superAdmin}x` })).status, 401);
  });

  test('me: password nahi aata, super admin ki company null', async () => {
    const res = await api.call('/auth/me', { token: superAdmin });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.role, 'SUPER_ADMIN');
    assert.equal(res.body.data.user.password, undefined);
    assert.equal(res.body.data.company, null);
  });

  test('unknown route -> 404 JSON', async () => {
    const res = await api.call('/kuch-nahi');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });
});

describe('companies (super admin)', () => {
  test('company + admin create', async () => {
    for (const [company, name] of [[A, 'Alpha'], [B, 'Beta']]) {
      const res = await api.call('/companies', {
        method: 'POST',
        token: superAdmin,
        body: { name: `${name} Pvt Ltd`, address: 'Gurugram', admin: { name: `${name} Admin`, email: `admin@${name.toLowerCase()}.test`, password: 'Password@1' } },
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.admin.role, 'ADMIN');
      company.id = res.body.data.company._id;
      company.adminId = res.body.data.admin._id;
      company.admin = await api.login(`admin@${name.toLowerCase()}.test`);
      assert.ok(company.admin);
    }
  });

  test('duplicate name (case-insensitive) aur duplicate admin email -> 409', async () => {
    let res = await api.call('/companies', { method: 'POST', token: superAdmin, body: { name: 'ALPHA PVT LTD' } });
    assert.equal(res.status, 409);
    res = await api.call('/companies', {
      method: 'POST',
      token: superAdmin,
      body: { name: 'Gamma', admin: { name: 'Dup', email: 'admin@alpha.test', password: 'Password@1' } },
    });
    assert.equal(res.status, 409);
    const list = await api.call('/companies', { token: superAdmin });
    assert.equal(list.body.data.total, 2, 'fail hui company bani nahi rehni chahiye');
    assert.deepEqual(list.body.data.counts, { all: 2, active: 2, blocked: 0 });
    // counts par search lagu hota hai, status filter nahi
    const filtered = await api.call('/companies?status=blocked&search=alpha', { token: superAdmin });
    assert.equal(filtered.body.data.total, 0);
    assert.deepEqual(filtered.body.data.counts, { all: 1, active: 1, blocked: 0 });
  });

  test('ADMIN /companies nahi khol sakta -> 403', async () => {
    assert.equal((await api.call('/companies', { token: A.admin })).status, 403);
    assert.equal((await api.call('/companies', { method: 'POST', token: A.admin, body: { name: 'Hack' } })).status, 403);
  });

  test('block karte hi admin ka token band, unblock par chalu', async () => {
    await api.call(`/companies/${A.id}/status`, { method: 'PATCH', token: superAdmin, body: { isActive: false } });
    assert.equal((await api.call('/auth/me', { token: A.admin })).status, 403);
    assert.equal((await api.call('/auth/login', { method: 'POST', body: { email: 'admin@alpha.test', password: 'Password@1' } })).status, 403);
    await api.call(`/companies/${A.id}/status`, { method: 'PATCH', token: superAdmin, body: { isActive: true } });
    assert.equal((await api.call('/auth/me', { token: A.admin })).status, 200);
  });

  test('admin ka password reset', async () => {
    const res = await api.call(`/companies/${B.id}/admins/${B.adminId}`, { method: 'PATCH', token: superAdmin, body: { password: 'NewPass@123' } });
    assert.equal(res.status, 200);
    assert.equal(await api.login('admin@beta.test'), undefined);
    B.admin = await api.login('admin@beta.test', 'NewPass@123');
    assert.ok(B.admin);
  });

  test('doosri company ke admin ko is company ke raste edit nahi kar sakte -> 404', async () => {
    const res = await api.call(`/companies/${B.id}/admins/${A.adminId}`, { method: 'PATCH', token: superAdmin, body: { name: 'Naya Naam' } });
    assert.equal(res.status, 404);
  });
});

describe('staff (admin) + tenant isolation', () => {
  test('validation -> 400', async () => {
    const res = await api.call('/staff', { method: 'POST', token: A.admin, body: { name: 'R', email: 'x', salaryStructure: { basic: -1 }, uan: '12' } });
    assert.equal(res.status, 400);
    const fields = res.body.errors.map((e) => e.field);
    for (const field of ['name', 'email', 'password', 'employeeCode', 'salaryStructure.basic', 'uan']) {
      assert.ok(fields.includes(field), `${field} ka error hona chahiye`);
    }
  });

  test('staff create: role/companyId body se nahi badalte', async () => {
    const res = await api.call('/staff', { method: 'POST', token: A.admin, body: staffBody({ email: 'ravi@alpha.test', role: 'ADMIN', companyId: B.id }) });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.staff.role, 'STAFF');
    assert.equal(res.body.data.staff.companyId, A.id);
    assert.equal(res.body.data.staff.password, undefined);
    A.staffId = res.body.data.staff._id;
    A.staff = await api.login('ravi@alpha.test');
  });

  test('same company mein duplicate employee code -> 409; doosri company mein chalta hai', async () => {
    let res = await api.call('/staff', { method: 'POST', token: A.admin, body: staffBody({ email: 'other@alpha.test' }) });
    assert.equal(res.status, 409);
    assert.equal(res.body.errors[0].field, 'employeeCode');

    res = await api.call('/staff', { method: 'POST', token: B.admin, body: staffBody({ email: 'sita@beta.test', name: 'Sita Devi', salaryStructure: { basic: 10000 } }) });
    assert.equal(res.status, 201);
    B.staffId = res.body.data.staff._id;
    B.staff = await api.login('sita@beta.test');
  });

  test('email poore system mein unique -> 409', async () => {
    const res = await api.call('/staff', { method: 'POST', token: B.admin, body: staffBody({ email: 'ravi@alpha.test', employeeCode: 'E9' }) });
    assert.equal(res.status, 409);
  });

  test('admin ko sirf apni company ka staff dikhta hai', async () => {
    const list = await api.call('/staff', { token: A.admin });
    assert.equal(list.body.data.total, 1);
    assert.deepEqual(list.body.data.counts, { all: 1, active: 1, inactive: 0 });
    // counts par status filter lagu nahi hota
    const inactive = await api.call('/staff?status=inactive', { token: A.admin });
    assert.equal(inactive.body.data.total, 0);
    assert.deepEqual(inactive.body.data.counts, { all: 1, active: 1, inactive: 0 });
    assert.equal(list.body.data.items[0]._id, A.staffId);
    assert.equal((await api.call(`/staff/${B.staffId}`, { token: A.admin })).status, 404);
    assert.equal((await api.call(`/staff/${B.staffId}`, { method: 'PUT', token: A.admin, body: { name: 'Hacked' } })).status, 404);
    assert.equal((await api.call(`/staff/${B.staffId}/status`, { method: 'PATCH', token: A.admin, body: { isActive: false } })).status, 404);
  });

  test('STAFF aur SUPER_ADMIN /staff nahi khol sakte -> 403', async () => {
    assert.equal((await api.call('/staff', { token: A.staff })).status, 403);
    assert.equal((await api.call('/staff', { token: superAdmin })).status, 403);
  });
});

describe('attendance (geofence punch)', () => {
  test('office location na ho to punch -> 400', async () => {
    const res = await api.call('/attendance/punch-in', { method: 'POST', token: A.staff, body: INSIDE });
    assert.equal(res.status, 400);
  });

  test('admin location set karta hai; staff settings nahi khol sakta', async () => {
    assert.equal((await api.call('/settings', { token: A.staff })).status, 403);
    const res = await api.call('/settings', {
      method: 'PUT',
      token: A.admin,
      body: { locations: [{ name: 'Head Office', ...OFFICE, radius: 100 }], holidays: [{ date: HOLIDAY, name: 'Test Holiday' }], settings: { weekOffDays: [0] } },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.company.locations[0].radius, 100);
    assert.equal(res.body.data.company.settings.maxGpsAccuracy, 100, 'baaki settings waisi hi rehni chahiye');
    const other = await api.call('/settings', { token: B.admin });
    assert.equal(other.body.data.company.locations.length, 0, 'company B par asar nahi');
  });

  test('staff ko aaj ka status aur office ki location (map ke liye) milti hai', async () => {
    const res = await api.call('/attendance/today', { token: A.staff });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.attendance, null);
    assert.deepEqual(res.body.data.locations, [{ name: 'Head Office', ...OFFICE, radius: 100 }]);
    assert.equal((await api.call('/attendance/today', { token: A.admin })).status, 403);
  });

  test('range ke bahar -> 403, doori ke saath', async () => {
    const res = await api.call('/attendance/punch-in', { method: 'POST', token: A.staff, body: OUTSIDE });
    assert.equal(res.status, 403);
    assert.match(res.body.message, /\(23\dm\)/);
  });

  test('GPS accuracy kharab -> 400', async () => {
    const res = await api.call('/attendance/punch-in', { method: 'POST', token: A.staff, body: { ...INSIDE, accuracy: 150 } });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /150m/);
  });

  test('punch in se pehle punch out -> 400; admin punch nahi kar sakta -> 403', async () => {
    assert.equal((await api.call('/attendance/punch-out', { method: 'POST', token: A.staff, body: INSIDE })).status, 400);
    assert.equal((await api.call('/attendance/punch-in', { method: 'POST', token: A.admin, body: INSIDE })).status, 403);
  });

  test('range ke andar punch in -> 201; dobara -> 409', async () => {
    const res = await api.call('/attendance/punch-in', { method: 'POST', token: A.staff, body: INSIDE });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.attendance.status, 'PRESENT');
    assert.equal(res.body.data.attendance.date, today);
    assert.equal(res.body.data.attendance.punchIn.locationName, 'Head Office');
    assert.equal((await api.call('/attendance/punch-in', { method: 'POST', token: A.staff, body: INSIDE })).status, 409);
  });

  test('auto punch-out job: flag lagta hai, din PRESENT rehta hai; punch out se flag hat jata hai', async () => {
    assert.equal(await markMissedPunchOuts({ includeToday: false }), 0, 'startup catch-up aaj ko nahi chhuta');
    assert.equal(await markMissedPunchOuts({ includeToday: true }), 1);
    let record = await Attendance.findOne({ userId: A.staffId, date: today });
    assert.equal(record.missedPunchOut, true);
    assert.equal(record.status, 'PRESENT');

    assert.equal((await api.call('/attendance/punch-out', { method: 'POST', token: A.staff, body: OUTSIDE })).status, 403);
    const res = await api.call('/attendance/punch-out', { method: 'POST', token: A.staff, body: INSIDE });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.attendance.missedPunchOut, false);
    assert.equal((await api.call('/attendance/punch-out', { method: 'POST', token: A.staff, body: INSIDE })).status, 409);
    assert.equal(await markMissedPunchOuts({ includeToday: true }), 0);
    record = await Attendance.findOne({ userId: A.staffId, date: today });
    assert.ok(record.punchOut.time);
  });

  test('admin dashboard: aaj ka summary; staff -> 403; doosri company alag', async () => {
    const res = await api.call('/attendance/today-summary', { token: A.admin });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.date, today);
    assert.equal(res.body.data.totalStaff, 1);
    assert.equal(res.body.data.present, 1);
    assert.equal(res.body.data.punchedOut, 1);
    assert.equal(res.body.data.notMarked, 0);
    assert.equal(res.body.data.locationsCount, 1);
    assert.ok(['WORKING', 'WEEK_OFF', 'HOLIDAY'].includes(res.body.data.dayType));

    const other = await api.call('/attendance/today-summary', { token: B.admin });
    assert.equal(other.body.data.present, 0);
    assert.equal(other.body.data.notMarked, 1);
    assert.equal(other.body.data.locationsCount, 0);
    assert.equal((await api.call('/attendance/today-summary', { token: A.staff })).status, 403);
  });

  test('monthly report (pichhla mahina): Present / Holiday / Week Off / Absent', async () => {
    // Staff ko pichhle mahine ki 1 tarikh se system mein maano, aur 2 din chhod kar baaki working days present
    await User.collection.updateOne({ email: 'ravi@alpha.test' }, { $set: { createdAt: new Date(`${prevMonth}-01T00:00:00Z`) } });
    await Attendance.insertMany(
      presentDays.map((date) => ({
        companyId: A.id,
        userId: A.staffId,
        date,
        punchIn: { time: new Date(), lat: OFFICE.lat, lng: OFFICE.lng, distance: 5 },
        punchOut: { time: new Date(), lat: OFFICE.lat, lng: OFFICE.lng, distance: 5 },
      }))
    );

    const res = await api.call(`/attendance?month=${prevMonth}`, { token: A.staff });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.days.length, prevDays.length);
    assert.deepEqual(res.body.data.summary, {
      present: presentDays.length,
      absent: 2,
      weekOff: sundays.length,
      holiday: 1,
      leave: 0,
      missedPunchOut: 0,
    });
    const byDate = Object.fromEntries(res.body.data.days.map((day) => [day.date, day]));
    assert.equal(byDate[HOLIDAY].status, 'HOLIDAY');
    assert.equal(byDate[absentDay1].status, 'ABSENT');
    assert.equal(byDate[presentDays[0]].status, 'PRESENT');
    assert.equal(byDate[sundays[0]].status, 'WEEK_OFF');
  });

  test('admin: userId ke saath kisi staff ka mahina; doosri company ka staff -> 404', async () => {
    assert.equal((await api.call(`/attendance?month=${prevMonth}`, { token: A.admin })).status, 400);
    const res = await api.call(`/attendance?month=${prevMonth}&userId=${A.staffId}`, { token: A.admin });
    assert.equal(res.body.data.summary.absent, 2);
    assert.equal((await api.call(`/attendance?month=${prevMonth}&userId=${B.staffId}`, { token: A.admin })).status, 404);
  });

  test('admin report: sirf apni company; staff -> 403', async () => {
    const res = await api.call(`/attendance/report?month=${prevMonth}`, { token: A.admin });
    assert.equal(res.body.data.rows.length, 1);
    assert.equal(res.body.data.rows[0].summary.present, presentDays.length);
    const other = await api.call(`/attendance/report?month=${prevMonth}`, { token: B.admin });
    assert.equal(other.body.data.rows.length, 1);
    assert.equal(other.body.data.rows[0].summary.present, 0);
    assert.equal((await api.call('/attendance/report', { token: A.staff })).status, 403);
  });
});

describe('leave (CL/EL, balance blocking)', () => {
  const balance = async () => {
    const doc = await LeaveBalance.findOne({ userId: A.staffId, year: prevYear }).lean();
    return doc.CL;
  };
  const apply = (body, token = A.staff) => api.call('/leaves', { method: 'POST', token, body: { type: 'CL', reason: 'Personal kaam', ...body } });

  test('default OFF: staff ke liye band (403), me mein leaveEnabled false', async () => {
    assert.equal((await api.call('/leaves/balance', { token: A.staff })).status, 403);
    assert.equal((await apply({ fromDate: absentDay1, toDate: absentDay1 })).status, 403);
    assert.equal((await api.call('/auth/me', { token: A.staff })).body.data.company.leaveEnabled, false);
    assert.equal(await LeaveBalance.countDocuments({ userId: A.staffId }), 0);
  });

  test('admin ON karta hai: is mahine ka credit turant lagta hai, dobara save se double nahi', async () => {
    const enable = () => api.call('/settings', { method: 'PUT', token: A.admin, body: { settings: { leaveEnabled: true, allowPastLeave: true } } });
    await enable();
    let res = await api.call('/leaves/balance', { token: A.staff });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.balance.CL, { available: 1, pending: 0, used: 0 });
    assert.deepEqual(res.body.data.balance.EL, { available: 1.25, pending: 0, used: 0 });
    assert.equal(res.body.data.balance.lastCreditedMonth, month);

    await api.call('/settings', { method: 'PUT', token: A.admin, body: { settings: { leaveEnabled: false } } });
    await enable();
    res = await api.call('/leaves/balance', { token: A.staff });
    assert.equal(res.body.data.balance.CL.available, 1);
    assert.equal((await api.call('/auth/me', { token: A.staff })).body.data.company.leaveEnabled, true);
  });

  test('validations', async () => {
    // Pichhle mahine wale saal ka balance tay kar do (January mein pichhla mahina pichhle saal ka hota hai)
    await LeaveBalance.updateOne(
      { userId: A.staffId, year: prevYear },
      { $set: { 'CL.available': 2, 'CL.pending': 0, 'CL.used': 0 }, $setOnInsert: { companyId: A.id } },
      { upsert: true }
    );
    assert.equal((await apply({ type: 'XX', fromDate: '2026-02-30', toDate: 'x', reason: '' })).status, 400);
    assert.equal((await apply({ fromDate: absentDay2, toDate: absentDay1 })).status, 400, 'to < from');
    assert.equal((await apply({ fromDate: sundays[0], toDate: sundays[0] })).status, 400, 'sirf week off');
    assert.equal((await apply({ fromDate: presentDays[0], toDate: presentDays[0] })).status, 400, 'us din attendance lagi hai');
    const tooMany = await apply({ type: 'EL', fromDate: absentDay1, toDate: absentDay2 });
    assert.equal(tooMany.status, 400, 'balance se zyada');
    assert.equal((await apply({ fromDate: absentDay1, toDate: absentDay1 }, A.admin)).status, 403, 'admin apply nahi karta');
    assert.deepEqual(await balance(), { available: 2, pending: 0, used: 0 }, 'fail hui requests se balance nahi hilta');
  });

  test('apply: available -> pending (block)', async () => {
    const res = await apply({ fromDate: absentDay1, toDate: absentDay1 });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.leave.days, 1);
    assert.equal(res.body.data.leave.status, 'PENDING');
    A.leaveId = res.body.data.leave._id;
    assert.deepEqual(await balance(), { available: 1, pending: 1, used: 0 });
  });

  test('overlapping dates -> 409', async () => {
    assert.equal((await apply({ fromDate: absentDay1, toDate: absentDay2 })).status, 409);
  });

  test('doosri company ka admin / doosra staff action nahi le sakta', async () => {
    assert.equal((await api.call(`/leaves/${A.leaveId}/approve`, { method: 'PATCH', token: B.admin, body: {} })).status, 404);
    assert.equal((await api.call(`/leaves/${A.leaveId}/approve`, { method: 'PATCH', token: A.staff, body: {} })).status, 403);
    assert.equal((await api.call('/leaves', { token: B.admin })).body.data.total, 0);
    assert.deepEqual(await balance(), { available: 1, pending: 1, used: 0 });
  });

  test('pending leave attendance mein abhi Absent hi hai', async () => {
    const res = await api.call(`/attendance?month=${prevMonth}`, { token: A.staff });
    assert.equal(res.body.data.summary.leave, 0);
    assert.equal(res.body.data.summary.absent, 2);
  });

  test('approve: pending -> used; dobara action -> 409', async () => {
    const res = await api.call(`/leaves/${A.leaveId}/approve`, { method: 'PATCH', token: A.admin, body: { note: 'Theek hai' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.leave.status, 'APPROVED');
    assert.deepEqual(await balance(), { available: 1, pending: 0, used: 1 });
    assert.equal((await api.call(`/leaves/${A.leaveId}/approve`, { method: 'PATCH', token: A.admin, body: {} })).status, 409);
    assert.equal((await api.call(`/leaves/${A.leaveId}/reject`, { method: 'PATCH', token: A.admin, body: {} })).status, 409);
    assert.equal((await api.call(`/leaves/${A.leaveId}/cancel`, { method: 'PATCH', token: A.staff })).status, 409);
    assert.deepEqual(await balance(), { available: 1, pending: 0, used: 1 });
  });

  test('approved leave attendance mein Leave ban jati hai (Absent 2 -> 1)', async () => {
    const res = await api.call(`/attendance?month=${prevMonth}`, { token: A.staff });
    assert.equal(res.body.data.summary.leave, 1);
    assert.equal(res.body.data.summary.absent, 1);
    const day = res.body.data.days.find((d) => d.date === absentDay1);
    assert.equal(day.status, 'LEAVE');
    assert.equal(day.note, 'CL');
  });

  test('reject: balance wapas', async () => {
    const applied = await apply({ fromDate: absentDay2, toDate: absentDay2 });
    assert.deepEqual(await balance(), { available: 0, pending: 1, used: 1 });
    const res = await api.call(`/leaves/${applied.body.data.leave._id}/reject`, { method: 'PATCH', token: A.admin, body: { note: 'Kaam zyada hai' } });
    assert.equal(res.body.data.leave.status, 'REJECTED');
    assert.deepEqual(await balance(), { available: 1, pending: 0, used: 1 });
  });

  test('staff cancel: balance wapas; doosra staff cancel nahi kar sakta', async () => {
    const applied = await apply({ fromDate: absentDay2, toDate: absentDay2 });
    assert.equal(applied.status, 201, 'reject hui dates par dobara apply ho sakta hai');
    const id = applied.body.data.leave._id;
    assert.equal((await api.call(`/leaves/${id}/cancel`, { method: 'PATCH', token: B.staff })).status, 403, 'B mein leave OFF hai');
    const res = await api.call(`/leaves/${id}/cancel`, { method: 'PATCH', token: A.staff });
    assert.equal(res.body.data.leave.status, 'CANCELLED');
    assert.deepEqual(await balance(), { available: 1, pending: 0, used: 1 });
  });

  test('lists: staff apni, admin company ki, status filter', async () => {
    assert.equal((await api.call('/leaves', { token: A.staff })).body.data.total, 3);
    const approved = await api.call('/leaves?status=APPROVED', { token: A.admin });
    assert.equal(approved.body.data.total, 1);
    // tabs ki ginti: status filter ke bawajood sab status ki ginti aati hai
    assert.deepEqual(approved.body.data.counts, { all: 3, PENDING: 0, APPROVED: 1, REJECTED: 1, CANCELLED: 1 });
    assert.equal((await api.call('/leaves', { token: B.admin })).body.data.counts.all, 0, 'doosri company ki ginti alag');
    assert.equal(approved.body.data.items[0].userId.employeeCode, 'E1');
  });
});

describe('dashboard (KPI, charts, notifications)', () => {
  test('bina login -> 401; galat days -> 400', async () => {
    assert.equal((await api.call('/dashboard')).status, 401);
    assert.equal((await api.call('/dashboard?days=5', { token: A.admin })).status, 400);
  });

  test('admin: KPI, trend aur aaj ki list apni company ki', async () => {
    const res = await api.call('/dashboard?days=7', { token: A.admin });
    assert.equal(res.status, 200);
    const data = res.body.data;
    assert.equal(data.kpis.staff.value, 1);
    assert.equal(data.kpis.staff.series.length, 6);
    assert.equal(data.attendanceTrend.length, 7);
    assert.equal(data.attendanceTrend.at(-1).date, today);
    assert.equal(data.attendanceTrend.at(-1).present, 1, 'aaj staff ne punch kiya tha');
    assert.equal(data.payrollTrend.length, 6);
    assert.equal(data.todayAttendance.length, 1);
    assert.equal(data.todayAttendance[0].status, 'PRESENT');
    assert.equal(data.todayAttendance[0].staff._id, A.staffId);
    assert.equal(data.today.present, 1);
    assert.equal(data.kpis.pendingLeaves.value, 0);
    assert.ok(Array.isArray(data.activity) && data.activity.some((item) => item.type === 'PUNCH_IN'));
    assert.ok(Array.isArray(data.upcoming));
  });

  test('admin: doosri company ka data alag', async () => {
    const data = (await api.call('/dashboard', { token: B.admin })).body.data;
    assert.equal(data.kpis.staff.value, 1);
    assert.equal(data.today.present, 0);
    assert.equal(data.attendanceTrend.length, 14);
    assert.ok(data.attendanceTrend.every((day) => day.present === 0));
    assert.equal(data.todayAttendance[0].staff._id, B.staffId);
  });

  test('staff: apne 6 mahine, leave balance aur aaj ka punch', async () => {
    const data = (await api.call('/dashboard', { token: A.staff })).body.data;
    assert.equal(data.monthly.length, 6);
    assert.equal(data.monthly.at(-2).period, prevMonth);
    assert.equal(data.monthly.at(-2).present, presentDays.length);
    assert.equal(data.monthly.at(-2).leave, 1);
    assert.equal(data.monthly.at(-2).absent, 1);
    assert.ok(data.today.punchIn && data.today.punchOut);
    assert.ok(data.kpis.leave, 'leave ON hai to balance aata hai');
    assert.equal(data.kpis.salary, null, 'abhi koi final slip nahi');
    // B mein leave OFF hai
    assert.equal((await api.call('/dashboard', { token: B.staff })).body.data.kpis.leave, null);
  });

  test('super admin: saari companies ke totals', async () => {
    const data = (await api.call('/dashboard', { token: superAdmin })).body.data;
    assert.equal(data.kpis.companies.value, 2);
    assert.deepEqual(data.status, { active: 2, blocked: 0 });
    assert.equal(data.kpis.staff.value, 2);
    assert.equal(data.kpis.admins.value, 2);
    assert.equal(data.companiesTrend.length, 6);
    assert.equal(data.topCompanies.length, 2);
    assert.deepEqual(data.withoutAdmin, []);
  });

  test('notifications: role ke hisaab se, aur haalat badalne par hat jati hain', async () => {
    const ids = async (token) => (await api.call('/dashboard/notifications', { token })).body.data.items.map((item) => item.id);
    // A: location hai, staff hai, pichhle mahine ki payroll abhi nahi bani
    assert.deepEqual(await ids(A.admin), ['payroll-missing']);
    // B: location nahi hai
    assert.ok((await ids(B.admin)).includes('no-location'));
    assert.deepEqual(await ids(superAdmin), []);
    assert.equal((await api.call('/dashboard/notifications')).status, 401);
  });
});

describe('payroll (30 days, PF/ESI, slip, Excel)', () => {
  let payrollId;

  test('super admin: global settings defaults; admin -> 403', async () => {
    const res = await api.call('/global-settings', { token: superAdmin });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.settings.payrollDaysBasis, 30);
    assert.equal(res.body.data.settings.pf.wageCeiling, 15000);
    assert.equal(res.body.data.settings.esi.wageLimit, 21000);
    assert.equal((await api.call('/global-settings', { token: A.admin })).status, 403);
    assert.equal((await api.call('/global-settings', { method: 'PUT', token: superAdmin, body: { pf: { employeeRate: 150 } } })).status, 400);
  });

  test('role aur validation', async () => {
    assert.equal((await api.call('/payroll/generate', { method: 'POST', token: A.staff, body: { month: prevMonth } })).status, 403);
    assert.equal((await api.call('/payroll/generate', { method: 'POST', token: A.admin, body: { month: 'bad' } })).status, 400);
    assert.equal((await api.call('/payroll/generate', { method: 'POST', token: A.admin, body: { month: '2999-01' } })).status, 400);
    assert.equal((await api.call(`/payroll/export?month=${prevMonth}`, { token: A.admin })).status, 404);
  });

  test('PF/ESI OFF (default): 1 absent = 1 LOP, koi statutory deduction nahi', async () => {
    const res = await api.call('/payroll/generate', { method: 'POST', token: A.admin, body: { month: prevMonth } });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.rows.length, 1);
    const row = res.body.data.rows[0];
    assert.equal(row.lopDays, 1);
    assert.equal(row.payableDays, 29);
    assert.equal(row.attendance.leave, 1, 'approved leave paid hai');
    assert.equal(row.earnings.gross, 19333.33);
    assert.equal(row.deductions.total, 0);
    assert.equal(row.netSalary, 19333.33);
    assert.equal(row.status, 'DRAFT');
    payrollId = row._id;
  });

  test('PF/ESI ON karke regenerate: exact numbers', async () => {
    await api.call('/settings', { method: 'PUT', token: A.admin, body: { settings: { pfEnabled: true, esiEnabled: true } } });
    const res = await api.call('/payroll/generate', { method: 'POST', token: A.admin, body: { month: prevMonth } });
    assert.equal(res.body.data.rows.length, 1, 'regenerate se duplicate nahi banta');
    const row = res.body.data.rows[0];
    assert.equal(row._id, payrollId);
    // 29/30: basic 14500, hra 4833.33
    assert.deepEqual(row.earnings, { basic: 14500, hra: 4833.33, special: 0, other: 0, gross: 19333.33 });
    assert.equal(row.pfWage, 14500);
    assert.deepEqual(row.deductions, { pf: 1740, esi: 145, other: 0, total: 1885 });
    assert.deepEqual(row.employerContribution, { epf: 532, eps: 1208, edli: 73, pfAdmin: 73, esi: 629, total: 2515 });
    assert.equal(row.netSalary, 17448.33);
    assert.equal(res.body.data.totals.netSalary, 17448.33);
    assert.equal(res.body.data.monthCompleted, true);
  });

  test('other deductions: net badalta hai, regenerate par bana rehta hai, hadd se zyada -> 400', async () => {
    let res = await api.call(`/payroll/${payrollId}`, { method: 'PATCH', token: A.admin, body: { otherDeductions: 448.33, remarks: 'Advance' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.payroll.netSalary, 17000);
    assert.equal((await api.call(`/payroll/${payrollId}`, { method: 'PATCH', token: A.admin, body: { otherDeductions: 999999 } })).status, 400);
    assert.equal((await api.call(`/payroll/${payrollId}`, { method: 'PATCH', token: B.admin, body: { otherDeductions: 1 } })).status, 404);
    res = await api.call('/payroll/generate', { method: 'POST', token: A.admin, body: { month: prevMonth } });
    assert.equal(res.body.data.rows[0].deductions.other, 448.33);
    assert.equal(res.body.data.rows[0].netSalary, 17000);
    assert.equal(res.body.data.rows[0].remarks, 'Advance');
  });

  test('draft: staff ko na list mein dikhta hai na slip milti hai; admin ko slip PDF milti hai', async () => {
    assert.equal((await api.call('/payroll/my', { token: A.staff })).body.data.rows.length, 0);
    assert.equal((await api.call(`/payroll/${payrollId}/slip`, { token: A.staff })).status, 404);
    const res = await api.raw(`/payroll/${payrollId}/slip`, { token: A.admin });
    const pdf = Buffer.from(await res.arrayBuffer());
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  });

  test('chalu mahina final nahi ho sakta; pichhla ho sakta hai aur lock ho jata hai', async () => {
    await api.call('/payroll/generate', { method: 'POST', token: A.admin, body: { month } });
    assert.equal((await api.call('/payroll/finalize', { method: 'POST', token: A.admin, body: { month } })).status, 400);
    assert.equal((await api.call('/payroll/finalize', { method: 'POST', token: B.admin, body: { month: prevMonth } })).status, 400, 'B ke paas draft nahi');

    const res = await api.call('/payroll/finalize', { method: 'POST', token: A.admin, body: { month: prevMonth } });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.rows[0].status, 'FINAL');
    assert.equal(res.body.data.hasDraft, false);
    assert.equal((await api.call('/payroll/finalize', { method: 'POST', token: A.admin, body: { month: prevMonth } })).status, 400);
    assert.equal((await api.call(`/payroll/${payrollId}`, { method: 'PATCH', token: A.admin, body: { otherDeductions: 1 } })).status, 409);
  });

  test('final payroll salary badalne aur regenerate ke baad bhi nahi badalti', async () => {
    await api.call(`/staff/${A.staffId}`, { method: 'PUT', token: A.admin, body: { name: 'Ravi K', salaryStructure: { basic: 15000, hra: 10000 } } });
    const res = await api.call('/payroll/generate', { method: 'POST', token: A.admin, body: { month: prevMonth } });
    const row = res.body.data.rows[0];
    assert.equal(row.status, 'FINAL');
    assert.equal(row.netSalary, 17000);
    assert.equal(row.staff.name, 'Ravi Kumar', 'slip par generate ke waqt ka naam');
  });

  test('staff: apni final slip dikhti aur download hoti hai; doosre nahi dekh sakte', async () => {
    const mine = await api.call('/payroll/my', { token: A.staff });
    assert.equal(mine.body.data.rows.length, 1);
    assert.equal(mine.body.data.rows[0].period, prevMonth);
    const res = await api.raw(`/payroll/${payrollId}/slip`, { token: A.staff });
    assert.equal(res.status, 200);
    assert.equal(Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
    assert.equal((await api.call(`/payroll/${payrollId}/slip`, { token: B.staff })).status, 404);
    assert.equal((await api.call(`/payroll/${payrollId}/slip`, { token: B.admin })).status, 404);
    assert.equal((await api.call('/payroll/my', { token: A.admin })).status, 403);
  });

  test('list aur Excel export: sirf apni company', async () => {
    assert.equal((await api.call(`/payroll?month=${prevMonth}`, { token: A.admin })).body.data.rows.length, 1);
    assert.equal((await api.call(`/payroll?month=${prevMonth}`, { token: B.admin })).body.data.rows.length, 0);
    assert.equal((await api.call(`/payroll?month=${prevMonth}`, { token: A.staff })).status, 403);

    const res = await api.raw(`/payroll/export?month=${prevMonth}`, { token: A.admin });
    const file = Buffer.from(await res.arrayBuffer());
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /spreadsheetml/);

    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file);
    const sheet = workbook.worksheets[0];
    assert.equal(sheet.getRow(3).getCell(1).value, 'Emp Code');
    assert.equal(sheet.getRow(4).getCell(1).value, 'E1');
    assert.equal(sheet.getRow(4).getCell(17).value, 17000);
    assert.equal(sheet.getRow(5).getCell(1).value, 'TOTAL');
    assert.equal(sheet.getRow(5).getCell(17).value, 17000);
  });

  test('global rate badalne ka asar nayi payroll par (Rule 8): PF 12% -> 10%', async () => {
    await api.call('/settings', { method: 'PUT', token: B.admin, body: { settings: { pfEnabled: true, esiEnabled: true } } });
    await api.call('/global-settings', { method: 'PUT', token: superAdmin, body: { pf: { employeeRate: 10 } } });
    const res = await api.call('/payroll/generate', { method: 'POST', token: B.admin, body: { month: prevMonth } });
    const row = res.body.data.rows[0];
    assert.equal(row.payableDays, 30);
    assert.equal(row.deductions.pf, 1000); // 10% of 10000
    assert.equal(row.employerContribution.epf + row.employerContribution.eps, 1200); // employer abhi bhi 12%
    assert.equal(row.deductions.esi, 75);
    // A ki final payroll nahi badli
    assert.equal((await api.call(`/payroll?month=${prevMonth}`, { token: A.admin })).body.data.rows[0].deductions.pf, 1740);
  });
});

describe('punch correction (staff request, admin approve / reject)', () => {
  // B ka staff pichhle mahine poora absent tha aur B ki payroll final nahi hai.
  const [day1, day2, day3] = workingDays;
  const request = (body, token = B.staff) =>
    api.call('/punch-corrections', { method: 'POST', token, body: { reason: 'Punch karna bhool gaya', ...body } });
  const act = (id, action, token, body = {}) => api.call(`/punch-corrections/${id}/${action}`, { method: 'PATCH', token, body });
  const dayOf = async (date) =>
    (await api.call(`/attendance?month=${prevMonth}`, { token: B.staff })).body.data.days.find((day) => day.date === date);
  const notificationIds = async (token) =>
    (await api.call('/dashboard/notifications', { token })).body.data.items.map((item) => item.id);
  let correctionId;

  test('validations', async () => {
    assert.equal((await request({ date: day1 })).status, 400, 'koi time nahi diya');
    assert.equal((await request({ date: day1, punchIn: '9:30' })).status, 400, 'HH:mm format');
    assert.equal((await request({ date: day1, punchIn: '09:30', reason: '' })).status, 400);
    assert.equal((await request({ date: '2999-01-01', punchIn: '09:30' })).status, 400, 'aane wali date');
    assert.equal((await request({ date: day1, punchIn: '09:30' }, B.admin)).status, 403, 'sirf staff request bhejta hai');
    assert.equal((await request({ date: day1, punchIn: '09:30' })).status, 400, 'account banne se pehle ka din');
  });

  test('final payroll wale mahine ki attendance nahi badal sakti', async () => {
    const res = await request({ date: presentDays[0], punchOut: '18:00' }, A.staff);
    assert.equal(res.status, 400);
    assert.match(res.body.message, /finalized/);
  });

  test('request: punch in bhoola -> PENDING; attendance abhi Absent; dobara -> 409', async () => {
    await User.collection.updateOne({ _id: (await User.findById(B.staffId))._id }, { $set: { createdAt: new Date(`${prevMonth}-01T00:00:00Z`) } });
    assert.equal((await request({ date: day1, punchOut: '18:00' })).status, 400, 'us din punch in hai hi nahi');
    assert.equal((await request({ date: day1, punchIn: '18:00', punchOut: '09:30' })).status, 400, 'out, in se pehle');

    const res = await request({ date: day1, punchIn: '09:30' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.correction.status, 'PENDING');
    // 09:30 IST = 04:00 UTC
    assert.equal(res.body.data.correction.punchIn, `${day1}T04:00:00.000Z`);
    correctionId = res.body.data.correction._id;

    assert.equal((await request({ date: day1, punchIn: '10:00' })).status, 409);
    assert.equal((await dayOf(day1)).status, 'ABSENT');
    assert.ok((await notificationIds(B.admin)).includes('pending-corrections'));
    assert.ok(!(await notificationIds(A.admin)).includes('pending-corrections'), 'doosri company ko nahi dikhta');
  });

  test('doosri company ka admin / staff action nahi le sakta', async () => {
    assert.equal((await act(correctionId, 'approve', A.admin)).status, 404);
    assert.equal((await act(correctionId, 'approve', B.staff)).status, 403);
    assert.equal((await act(correctionId, 'cancel', A.staff)).status, 404);
    assert.equal((await api.call('/punch-corrections', { token: A.admin })).body.data.total, 0);
  });

  test('approve: Absent din Present ban jata hai; dobara action -> 409', async () => {
    const res = await act(correctionId, 'approve', B.admin, { note: 'Theek hai' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.correction.status, 'APPROVED');

    const day = await dayOf(day1);
    assert.equal(day.status, 'PRESENT');
    assert.equal(day.punchIn.time, `${day1}T04:00:00.000Z`);
    assert.equal(day.punchIn.corrected, true);
    assert.equal(day.punchOut, null);

    assert.equal((await act(correctionId, 'approve', B.admin)).status, 409);
    assert.equal((await act(correctionId, 'reject', B.admin)).status, 409);
    assert.equal((await act(correctionId, 'cancel', B.staff)).status, 409);
    assert.ok(!(await notificationIds(B.admin)).includes('pending-corrections'));
    assert.ok((await notificationIds(B.staff)).includes(`correction-${correctionId}`));
  });

  test('punch out bhoola: approve par time lagta hai aur missed flag hat jata hai', async () => {
    await markMissedPunchOuts({ includeToday: false });
    assert.equal((await dayOf(day1)).missedPunchOut, true);
    assert.equal((await request({ date: day1, punchOut: '09:00' })).status, 400, 'out, record ke in se pehle');

    const res = await request({ date: day1, punchOut: '18:15' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.correction.recorded.punchIn, `${day1}T04:00:00.000Z`);
    assert.equal((await act(res.body.data.correction._id, 'approve', B.admin)).status, 200);

    const day = await dayOf(day1);
    assert.equal(day.punchIn.time, `${day1}T04:00:00.000Z`, 'punch in nahi chheda');
    assert.equal(day.punchOut.time, `${day1}T12:45:00.000Z`);
    assert.equal(day.missedPunchOut, false);
  });

  test('reject: attendance nahi badalti, note staff ko dikhta hai', async () => {
    const applied = await request({ date: day2, punchIn: '09:00', punchOut: '18:00' });
    const res = await act(applied.body.data.correction._id, 'reject', B.admin, { note: 'Us din aap nahi aaye the' });
    assert.equal(res.body.data.correction.status, 'REJECTED');
    assert.equal((await dayOf(day2)).status, 'ABSENT');
    const mine = await api.call('/punch-corrections?status=REJECTED', { token: B.staff });
    assert.equal(mine.body.data.items[0].actionNote, 'Us din aap nahi aaye the');
  });

  test('staff cancel; reject/cancel hui date par dobara request ho sakti hai', async () => {
    const applied = await request({ date: day2, punchIn: '09:00' });
    assert.equal(applied.status, 201);
    const res = await act(applied.body.data.correction._id, 'cancel', B.staff);
    assert.equal(res.body.data.correction.status, 'CANCELLED');
    assert.equal((await dayOf(day2)).status, 'ABSENT');
  });

  test('request ke baad payroll final ho jaye to approve nahi hota, request pending rehti hai', async () => {
    const applied = await request({ date: day3, punchIn: '09:00', punchOut: '18:00' });
    await api.call('/payroll/generate', { method: 'POST', token: B.admin, body: { month: prevMonth } });
    await api.call('/payroll/finalize', { method: 'POST', token: B.admin, body: { month: prevMonth } });
    assert.equal((await act(applied.body.data.correction._id, 'approve', B.admin)).status, 400);
    assert.equal((await dayOf(day3)).status, 'ABSENT');
    assert.equal((await api.call('/punch-corrections?status=PENDING', { token: B.admin })).body.data.total, 1);
  });

  test('lists: staff apni, admin company ki, status tabs ki ginti', async () => {
    const list = await api.call('/punch-corrections?status=APPROVED', { token: B.admin });
    assert.equal(list.body.data.total, 2);
    assert.deepEqual(list.body.data.counts, { all: 5, PENDING: 1, APPROVED: 2, REJECTED: 1, CANCELLED: 1 });
    assert.equal(list.body.data.items[0].userId.employeeCode.length > 0, true);
    assert.equal((await api.call('/punch-corrections', { token: B.staff })).body.data.total, 5);
    assert.equal((await api.call('/punch-corrections', { token: A.staff })).body.data.total, 0);
  });
});

describe('half day leave', () => {
  // A ka staff: absentDay2 par na punch hai na leave; presentDays par punch hai.
  const apply = (body) => api.call('/leaves', { method: 'POST', token: A.staff, body: { type: 'CL', reason: 'Doctor ke paas jaana hai', ...body } });
  const approve = (id) => api.call(`/leaves/${id}/approve`, { method: 'PATCH', token: A.admin, body: {} });
  const monthOf = async () => (await api.call(`/attendance?month=${prevMonth}`, { token: A.staff })).body.data;
  const cl = async () => (await LeaveBalance.findOne({ userId: A.staffId, year: prevYear }).lean()).CL;
  const workedDay = presentDays[0];

  test('validations: galat value, ek se zyada din', async () => {
    assert.equal((await apply({ fromDate: absentDay2, toDate: absentDay2, halfDay: 'MORNING' })).status, 400);
    assert.equal((await apply({ fromDate: absentDay2, toDate: presentDays[0], halfDay: 'FIRST' })).status, 400);
  });

  test('apply: 0.5 din block hota hai; approve par 0.5 used', async () => {
    const before = await cl();
    const res = await apply({ fromDate: absentDay2, toDate: absentDay2, halfDay: 'FIRST' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.leave.days, 0.5);
    assert.equal(res.body.data.leave.halfDay, 'FIRST');
    assert.deepEqual(await cl(), { available: before.available - 0.5, pending: 0.5, used: before.used });

    assert.equal((await approve(res.body.data.leave._id)).status, 200);
    assert.deepEqual(await cl(), { available: before.available - 0.5, pending: 0, used: before.used + 0.5 });
  });

  test('punch nahi hua: aadha din leave, aadha absent (0.5 LOP)', async () => {
    const data = await monthOf();
    const day = data.days.find((d) => d.date === absentDay2);
    assert.equal(day.status, 'ABSENT');
    assert.equal(day.halfDay, 'FIRST');
    assert.equal(day.note, 'CL');
    assert.equal(data.summary.absent, 0.5);
    assert.equal(data.summary.leave, 1.5);
  });

  test('jis din punch hai us din bhi half day lag sakti hai: aadha present, aadha leave', async () => {
    assert.equal((await apply({ fromDate: workedDay, toDate: workedDay })).status, 400, 'poore din ki leave punch wale din nahi');
    const res = await apply({ fromDate: workedDay, toDate: workedDay, halfDay: 'SECOND' });
    assert.equal(res.status, 201);
    assert.equal((await monthOf()).days.find((d) => d.date === workedDay).status, 'PRESENT', 'pending leave ka asar nahi');
    await approve(res.body.data.leave._id);

    const data = await monthOf();
    const day = data.days.find((d) => d.date === workedDay);
    assert.equal(day.status, 'HALF_DAY');
    assert.equal(day.halfDay, 'SECOND');
    assert.ok(day.punchIn);
    assert.equal(data.summary.present, presentDays.length - 0.5);
    assert.equal(data.summary.leave, 2);
    assert.equal(data.summary.absent, 0.5);
  });
});

describe('sales meetings: settings, sales manager flag, models', () => {
  // await andar hi hona chahiye: Mongoose query await hone par chalti hai, aur tab tenant context chahiye.
  const inTenant = (id) => (fn) => runWithTenant(new mongoose.Types.ObjectId(id), async () => await fn());
  const inA = (fn) => inTenant(A.id)(fn);
  const inB = (fn) => inTenant(B.id)(fn);
  const settings = (token, body) => api.call('/settings', { method: 'PUT', token, body: { settings: body } });
  let clientId;
  const meetingData = (overrides = {}) => ({
    clientId,
    salesManagerId: A.staffId,
    title: 'Product demo',
    date: today,
    startAt: zonedTime(today, '10:30'),
    endAt: zonedTime(today, '11:30'),
    location: { name: 'ABC Pvt Ltd', lat: OFFICE.lat, lng: OFFICE.lng },
    createdBy: A.adminId,
    ...overrides,
  });

  test('sales module default OFF; admin ON karta hai to me mein dikhta hai', async () => {
    assert.equal((await api.call('/auth/me', { token: A.staff })).body.data.company.salesEnabled, false);
    assert.equal((await settings(A.admin, { meetingCheckInGraceMin: 999 })).status, 400);
    assert.equal((await settings(A.staff, { salesEnabled: true })).status, 403);

    const res = await settings(A.admin, { salesEnabled: true, requireVisitPhoto: true, meetingCheckInGraceMin: 15 });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.company.settings.salesEnabled, true);
    assert.equal(res.body.data.company.settings.meetingCheckInGraceMin, 15);
    assert.equal(res.body.data.company.settings.leaveEnabled, true, 'baaki settings nahi chhedi');

    assert.equal((await api.call('/auth/me', { token: A.staff })).body.data.company.salesEnabled, true);
    assert.equal((await api.call('/auth/me', { token: B.staff })).body.data.company.salesEnabled, false);
  });

  test('sales manager flag: default false, sirf admin badal sakta hai', async () => {
    assert.equal((await api.call('/auth/me', { token: A.staff })).body.data.user.isSalesManager, false);
    const res = await api.call(`/staff/${A.staffId}`, { method: 'PUT', token: A.admin, body: { isSalesManager: true } });
    assert.equal(res.status, 200);
    assert.equal((await api.call('/auth/me', { token: A.staff })).body.data.user.isSalesManager, true);
    assert.equal((await api.call(`/staff/${A.staffId}`, { method: 'PUT', token: B.admin, body: { isSalesManager: false } })).status, 404);
  });

  test('Client: naam company ke andar unique (case-insensitive), doosri company mein chalta hai', async () => {
    const client = await inA(() => Client.create({ name: 'ABC Pvt Ltd', contactPerson: 'Mr. Gupta', phone: '9810000000' }));
    clientId = client._id;
    assert.equal(String(client.companyId), A.id, 'companyId tenant se laga');
    assert.equal(client.isActive, true);

    await assert.rejects(inA(() => Client.create({ name: 'abc pvt ltd' })), { code: 11000 });
    await inB(() => Client.create({ name: 'ABC Pvt Ltd' }));
    assert.equal(await inA(() => Client.countDocuments()), 1);
    assert.equal(await inB(() => Client.findById(clientId)), null, 'doosri company ko nahi dikhta');
  });

  test('Meeting: defaults, validation aur tenant isolation', async () => {
    const meeting = await inA(() => Meeting.create(meetingData()));
    assert.equal(meeting.status, 'SCHEDULED');
    assert.equal(meeting.location.radius, 100, 'default geofence 100m');
    assert.equal(meeting.qr.version, 1);
    assert.equal(String(meeting.companyId), A.id);
    assert.deepEqual(meeting.attachments.toObject(), []);

    await assert.rejects(inA(() => Meeting.create(meetingData({ endAt: zonedTime(today, '10:00') }))), /End time/);
    await assert.rejects(inA(() => Meeting.create(meetingData({ location: { lat: 95, lng: 77 } }))), /lat/);
    await assert.rejects(inA(() => Meeting.create(meetingData({ status: 'EXPIRED' }))), /status/);
    await assert.rejects(inA(() => Meeting.create(meetingData({ title: '' }))), /title/);

    assert.equal(await inB(() => Meeting.countDocuments()), 0);
    assert.equal(await inA(() => Meeting.countDocuments()), 1);
  });

  test('Meeting: QR token hash unique; ek sales manager ki ek hi khuli visit', async () => {
    const punch = { at: new Date(), lat: OFFICE.lat, lng: OFFICE.lng, distance: 12, locationStatus: 'VERIFIED' };
    const [first] = await inA(() => Meeting.find());
    first.qr.tokenHash = 'hash-1';
    first.status = 'CHECKED_IN';
    first.checkIn = punch;
    first.events.push({ type: 'CHECKED_IN', by: A.staffId });
    await inA(() => first.save());

    // Bina token wali kai meetings ban sakti hain (partial index), same hash wali nahi.
    const second = await inA(() => Meeting.create(meetingData({ title: 'Second visit' })));
    await assert.rejects(inA(() => Meeting.create(meetingData({ qr: { tokenHash: 'hash-1' } }))), { code: 11000 });

    // Pehli visit khuli hai: doosri meeting CHECKED_IN nahi ho sakti.
    await assert.rejects(
      inA(() => Meeting.updateOne({ _id: second._id }, { $set: { status: 'CHECKED_IN', checkIn: punch } })),
      { code: 11000 }
    );
    await inA(() => Meeting.updateOne({ _id: first._id }, { $set: { status: 'COMPLETED' } }));
    const result = await inA(() => Meeting.updateOne({ _id: second._id }, { $set: { status: 'CHECKED_IN', checkIn: punch } }));
    assert.equal(result.modifiedCount, 1, 'pehli poori hone ke baad doosri khul sakti hai');
  });
});

describe('sales meetings: clients + meetings API', () => {
  // Pichhle describe se: A mein sales ON, Ravi sales manager, client "ABC Pvt Ltd" (bina location),
  // aaj ki 2 meetings (1 COMPLETED, 1 CHECKED_IN). B mein sales OFF.
  const tomorrow = addDays(today, 1);
  const call = (method, path, token, body) => api.call(path, { method, token, body });
  const C = {}; // { abc, xyz, other (non-sales staff token), otherId, meetingId }
  const meetingBody = (overrides = {}) => ({
    clientId: C.xyz,
    salesManagerId: A.staffId,
    title: 'Quarterly review',
    date: tomorrow,
    startTime: '10:30',
    endTime: '11:30',
    ...overrides,
  });

  test('module OFF / role / sales manager flag ke bina andar nahi', async () => {
    assert.equal((await call('GET', '/clients')).status, 401);
    assert.equal((await call('GET', '/clients', B.admin)).status, 403, 'B mein sales OFF');
    assert.equal((await call('GET', '/meetings', B.staff)).status, 403);
    assert.equal((await call('GET', '/clients', A.staff)).status, 403, 'clients sirf admin ke');
    assert.equal((await call('GET', '/meetings', superAdmin)).status, 403);

    const res = await call('POST', '/staff', A.admin, staffBody({ name: 'Mohan Lal', email: 'mohan@alpha.test', employeeCode: 'E2' }));
    C.otherId = res.body.data.staff._id;
    C.other = await api.login('mohan@alpha.test');
    assert.equal((await call('GET', '/meetings', C.other)).status, 403, 'sales manager nahi hai');
    assert.equal((await call('GET', '/meetings', A.staff)).status, 200);
  });

  test('clients: validation, create, duplicate, search, update, status', async () => {
    assert.equal((await call('POST', '/clients', A.admin, { contactPerson: 'X' })).status, 400);
    assert.equal((await call('POST', '/clients', A.admin, { name: 'Half Location', lat: 28.5 })).status, 400, 'lat ke saath lng zaroori');

    let res = await call('POST', '/clients', A.admin, {
      name: 'XYZ Industries',
      contactPerson: 'Mrs. Mehta',
      phone: '9811111111',
      address: 'Sector 62, Noida',
      lat: 28.6273,
      lng: 77.3725,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.client.companyId, A.id);
    C.xyz = res.body.data.client._id;

    res = await call('POST', '/clients', A.admin, { name: 'abc pvt ltd' });
    assert.equal(res.status, 409);
    assert.equal(res.body.errors[0].field, 'name');

    res = await call('GET', '/clients?search=xyz', A.admin);
    assert.equal(res.body.data.total, 1);
    assert.deepEqual(res.body.data.counts, { all: 1, active: 1, inactive: 0 });
    res = await call('GET', '/clients', A.admin);
    assert.deepEqual(res.body.data.items.map((client) => client.name), ['ABC Pvt Ltd', 'XYZ Industries']);
    C.abc = res.body.data.items[0]._id;

    res = await call('PUT', `/clients/${C.xyz}`, A.admin, { name: 'ABC PVT LTD' });
    assert.equal(res.status, 409, 'rename se bhi duplicate nahi');
    res = await call('PUT', `/clients/${C.xyz}`, A.admin, { contactPerson: 'Mr. Mehta' });
    assert.equal(res.body.data.client.contactPerson, 'Mr. Mehta');
    assert.equal(res.body.data.client.lat, 28.6273, 'baaki fields nahi chhede');

    res = await call('POST', '/clients', A.admin, { name: 'Old Client' });
    C.inactive = res.body.data.client._id;
    res = await call('PATCH', `/clients/${C.inactive}/status`, A.admin, { isActive: false });
    assert.equal(res.body.data.client.isActive, false);
    assert.deepEqual((await call('GET', '/clients?status=inactive', A.admin)).body.data.counts, { all: 3, active: 2, inactive: 1 });
  });

  test('clients: doosri company ko nahi dikhte', async () => {
    await call('PUT', '/settings', B.admin, { settings: { salesEnabled: true } });
    assert.equal((await call('GET', `/clients/${C.xyz}`, B.admin)).status, 404);
    assert.equal((await call('PUT', `/clients/${C.xyz}`, B.admin, { name: 'Hacked' })).status, 404);
    assert.equal((await call('GET', '/clients', B.admin)).body.data.total, 1, 'B ka apna "ABC Pvt Ltd"');
  });

  test('meeting create: validations', async () => {
    const create = (overrides) => call('POST', '/meetings', A.admin, meetingBody(overrides));
    assert.equal((await call('POST', '/meetings', A.admin, { title: 'Bas title' })).status, 400);
    assert.equal((await call('POST', '/meetings', A.staff, meetingBody())).status, 403, 'sirf admin banata hai');
    assert.equal((await create({ startTime: '11:30', endTime: '10:30' })).status, 400);
    assert.equal((await create({ startTime: '25:00' })).status, 400);
    assert.equal((await create({ date: `${prevMonth}-10` })).status, 400, 'beeta hua waqt');
    assert.equal((await create({ location: { radius: 5 } })).status, 400, 'radius 10m se kam');
    assert.equal((await create({ location: { lat: 28.6 } })).status, 400, 'lat ke saath lng zaroori');

    let res = await create({ clientId: C.inactive });
    assert.equal(res.status, 400);
    assert.equal(res.body.errors[0].field, 'clientId');
    res = await create({ salesManagerId: C.otherId });
    assert.equal(res.status, 400, 'sales manager nahi hai');
    assert.equal(res.body.errors[0].field, 'salesManagerId');
    assert.equal((await create({ salesManagerId: B.staffId })).status, 400, 'doosri company ka staff');
    assert.equal((await create({ salesManagerId: A.adminId })).status, 400, 'admin ko assign nahi hoti');

    res = await create({ clientId: C.abc });
    assert.equal(res.status, 400, 'client ki location nahi hai aur meeting mein bhi nahi di');
    assert.equal(res.body.errors[0].field, 'location.lat');
  });

  test('meeting create: client ki location aur contact apne aap lagte hain', async () => {
    const res = await call('POST', '/meetings', A.admin, meetingBody());
    assert.equal(res.status, 201);
    const { meeting } = res.body.data;
    C.meetingId = meeting._id;
    assert.equal(meeting.status, 'SCHEDULED');
    assert.equal(meeting.date, tomorrow);
    assert.equal(meeting.startAt, `${tomorrow}T05:00:00.000Z`, '10:30 IST');
    assert.equal(meeting.endAt, `${tomorrow}T06:00:00.000Z`);
    assert.deepEqual(meeting.location, { name: 'XYZ Industries', address: 'Sector 62, Noida', lat: 28.6273, lng: 77.3725, radius: 100 });
    assert.equal(meeting.contactPerson, 'Mr. Mehta');
    assert.equal(meeting.contactPhone, '9811111111');
    assert.equal(meeting.clientId.name, 'XYZ Industries');
    assert.equal(meeting.salesManagerId.employeeCode, 'E1');
    assert.equal(meeting.createdBy, A.adminId);
    assert.equal(meeting.events[0].type, 'CREATED');
    assert.equal(meeting.qr.tokenHash, undefined);
  });

  test('meeting create: apni location / radius; same waqt par dobara -> 409, turant baad chalta hai', async () => {
    let res = await call('POST', '/meetings', A.admin, meetingBody({ startTime: '11:00', endTime: '12:00' }));
    assert.equal(res.status, 409);
    assert.equal(res.body.errors[0].field, 'salesManagerId');

    res = await call('POST', '/meetings', A.admin, meetingBody({
      clientId: C.abc,
      title: 'Site visit',
      startTime: '11:30',
      endTime: '12:15',
      contactPerson: 'Mr. Verma',
      location: { name: 'ABC Warehouse', lat: 28.5355, lng: 77.391, radius: 150 },
    }));
    assert.equal(res.status, 201);
    assert.equal(res.body.data.meeting.location.radius, 150);
    assert.equal(res.body.data.meeting.location.name, 'ABC Warehouse');
    assert.equal(res.body.data.meeting.contactPerson, 'Mr. Verma');
    C.secondId = res.body.data.meeting._id;
  });

  test('list: filters, search, status ki ginti; staff ko sirf apni', async () => {
    let res = await call('GET', '/meetings', A.admin);
    assert.equal(res.body.data.total, 4);
    assert.deepEqual(res.body.data.counts, { all: 4, SCHEDULED: 2, QR_SENT: 0, CHECKED_IN: 1, COMPLETED: 1, MISSED: 0, CANCELLED: 0 });
    assert.equal(res.body.data.items[0]._id, C.secondId, 'sabse baad wali pehle');
    assert.equal(res.body.data.items[0].events, undefined, 'list mein audit history nahi');

    res = await call('GET', `/meetings?from=${tomorrow}&status=SCHEDULED`, A.admin);
    assert.equal(res.body.data.total, 2);
    assert.equal(res.body.data.counts.all, 2, 'ginti par date filter lagu');
    assert.equal((await call('GET', `/meetings?to=${today}`, A.admin)).body.data.total, 2);
    assert.equal((await call('GET', '/meetings?search=xyz', A.admin)).body.data.total, 1);
    assert.equal((await call('GET', '/meetings?search=site', A.admin)).body.data.total, 1);
    assert.equal((await call('GET', '/meetings?search=ravi', A.admin)).body.data.total, 4);
    assert.equal((await call('GET', `/meetings?clientId=${C.xyz}`, A.admin)).body.data.counts.all, 1);
    assert.equal((await call('GET', `/meetings?salesManagerId=${C.otherId}`, A.admin)).body.data.counts.all, 0);
    assert.equal((await call('GET', '/meetings?locationStatus=VERIFIED', A.admin)).body.data.total, 2);
    assert.equal((await call('GET', '/meetings?status=EXPIRED', A.admin)).status, 400);

    assert.equal((await call('GET', '/meetings', A.staff)).body.data.total, 4);
    await call('PUT', `/staff/${C.otherId}`, A.admin, { isSalesManager: true });
    res = await call('GET', `/meetings?salesManagerId=${A.staffId}`, C.other);
    assert.equal(res.body.data.total, 0, 'doosre ki meetings query se bhi nahi milti');
    assert.equal(res.body.data.counts.all, 0);
    assert.equal((await call('GET', '/meetings', B.admin)).body.data.total, 0);
  });

  test('detail: admin aur assigned sales manager ko; doosre ko 404', async () => {
    const res = await call('GET', `/meetings/${C.meetingId}`, A.admin);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.meeting.events[0].by.name.length > 0, true);
    assert.equal((await call('GET', `/meetings/${C.meetingId}`, A.staff)).status, 200);
    assert.equal((await call('GET', `/meetings/${C.meetingId}`, C.other)).status, 404);
    assert.equal((await call('GET', `/meetings/${C.meetingId}`, B.admin)).status, 404);
    assert.equal((await call('GET', '/meetings/not-an-id', A.admin)).status, 400);
  });

  test('update: sirf admin, sirf shuru na hui meeting; audit mein darj', async () => {
    const put = (id, token, body) => call('PUT', `/meetings/${id}`, token, body);
    assert.equal((await put(C.meetingId, A.staff, { title: 'X1' })).status, 403);
    assert.equal((await put(C.meetingId, B.admin, { title: 'X1' })).status, 404);
    assert.equal((await put(C.meetingId, A.admin, { date: tomorrow })).status, 400, 'date ke saath dono time');
    assert.equal((await put(C.meetingId, A.admin, { date: tomorrow, startTime: '11:45', endTime: '12:30' })).status, 409, 'doosri meeting se takkar');
    assert.equal((await put(C.meetingId, A.admin, { salesManagerId: B.staffId })).status, 400);

    let res = await put(C.meetingId, A.admin, {
      title: 'Annual review',
      date: tomorrow,
      startTime: '09:00',
      endTime: '10:00',
      location: { lat: 28.63, lng: 77.37, radius: 200 },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.meeting.title, 'Annual review');
    assert.equal(res.body.data.meeting.startAt, `${tomorrow}T03:30:00.000Z`);
    assert.equal(res.body.data.meeting.location.radius, 200);
    assert.equal(res.body.data.meeting.location.name, 'XYZ Industries', 'naam na diya to client ka');
    assert.equal(res.body.data.meeting.contactPerson, 'Mr. Mehta', 'baaki fields nahi chhede');
    assert.deepEqual(res.body.data.meeting.events.map((event) => event.type), ['CREATED', 'QR_GENERATED', 'UPDATED']);

    // Sales manager badalna: Mohan ab sales manager hai
    res = await put(C.meetingId, A.admin, { salesManagerId: C.otherId });
    assert.equal(res.body.data.meeting.salesManagerId.name, 'Mohan Lal');
    assert.equal((await call('GET', `/meetings/${C.meetingId}`, A.staff)).status, 404, 'ab Ravi ki nahi rahi');
    assert.equal((await call('GET', `/meetings/${C.meetingId}`, C.other)).status, 200);

    const checkedIn = (await call('GET', '/meetings?status=CHECKED_IN', A.admin)).body.data.items[0];
    assert.equal((await put(checkedIn._id, A.admin, { title: 'Late change' })).status, 409);
    C.checkedInId = checkedIn._id;
  });

  test('cancel: sirf shuru na hui meeting; dobara -> 409; waqt khali ho jata hai', async () => {
    const cancel = (id, token, body = {}) => call('PATCH', `/meetings/${id}/cancel`, token, body);
    assert.equal((await cancel(C.secondId, A.staff)).status, 403);
    assert.equal((await cancel(C.secondId, B.admin)).status, 404);
    assert.equal((await cancel(C.checkedInId, A.admin)).status, 409, 'check-in ke baad cancel nahi');

    const res = await cancel(C.secondId, A.admin, { reason: 'Client ne mana kar diya' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.meeting.status, 'CANCELLED');
    assert.equal(res.body.data.meeting.cancelReason, 'Client ne mana kar diya');
    assert.equal(res.body.data.meeting.events.at(-1).type, 'CANCELLED');
    assert.equal((await cancel(C.secondId, A.admin)).status, 409);
    assert.equal((await call('PUT', `/meetings/${C.secondId}`, A.admin, { title: 'Zinda karo' })).status, 409);

    // Cancel hui meeting ka waqt (11:30-12:15, Ravi) ab doosri meeting ko mil sakta hai
    assert.equal((await call('POST', '/meetings', A.admin, meetingBody({ startTime: '11:30', endTime: '12:15' }))).status, 201);
  });
});

describe('sales meetings: QR token', () => {
  // A mein check-in grace 15 minute hai (settings wale test se).
  const day = addDays(today, 2);
  const call = (method, path, token, body) => api.call(path, { method, token, body });
  const qrOf = async (id) => (await call('GET', `/meetings/${id}/qr`, A.admin)).body.data.qr;
  const hashInDb = async (id) => (await Meeting.findById(id).lean()).qr.tokenHash;
  const Q = {}; // { id, token, mohanId }

  test('meeting bante hi QR banta hai: token response mein nahi, sirf hash DB mein', async () => {
    const list = await call('GET', '/meetings?status=SCHEDULED', A.admin);
    const base = list.body.data.items.find((item) => item.salesManagerId.name === 'Mohan Lal');
    Q.mohanId = base.salesManagerId._id;

    const res = await call('POST', '/meetings', A.admin, {
      clientId: base.clientId._id,
      salesManagerId: A.staffId,
      title: 'QR wali meeting',
      date: day,
      startTime: '10:00',
      endTime: '11:00',
    });
    assert.equal(res.status, 201);
    const { meeting } = res.body.data;
    Q.id = meeting._id;
    assert.deepEqual(meeting.events.map((event) => event.type), ['CREATED', 'QR_GENERATED']);
    assert.equal(meeting.qr.version, 1);
    assert.equal(meeting.qr.expiresAt, `${day}T05:45:00.000Z`, 'end 11:00 IST + 15 min');
    assert.equal(meeting.qr.tokenHash, undefined);
    assert.equal(JSON.stringify(res.body).includes('token'), false, 'token ya hash kahin nahi');
    assert.match(await hashInDb(Q.id), /^[0-9a-f]{64}$/);
  });

  test('QR sirf admin ko: token random jaisa, baar-baar same, DB mein uska hash', async () => {
    assert.equal((await call('GET', `/meetings/${Q.id}/qr`, A.staff)).status, 403);
    assert.equal((await call('GET', `/meetings/${Q.id}/qr`, B.admin)).status, 404);

    const qr = await qrOf(Q.id);
    Q.token = qr.token;
    assert.match(qr.token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(qr.token.includes(Q.id), false, 'QR mein meeting ka ID nahi');
    assert.equal(qr.version, 1);
    assert.equal(qr.expired, false);
    assert.equal(qr.sentAt, null);
    assert.equal((await qrOf(Q.id)).token, qr.token);
    assert.equal(crypto.createHash('sha256').update(qr.token).digest('hex'), await hashInDb(Q.id));

    // Har meeting ka apna token
    const other = (await call('GET', '/meetings?status=SCHEDULED', A.admin)).body.data.items.find((item) => item._id !== Q.id);
    assert.notEqual((await qrOf(other._id)).token, qr.token);
  });

  test('sent mark karne par status QR_SENT aur audit mein darj', async () => {
    assert.equal((await call('POST', `/meetings/${Q.id}/qr/sent`, A.admin, { channel: 'pigeon' })).status, 400);
    assert.equal((await call('POST', `/meetings/${Q.id}/qr/sent`, A.staff, {})).status, 403);
    const res = await call('POST', `/meetings/${Q.id}/qr/sent`, A.admin, { channel: 'share' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.meeting.status, 'QR_SENT');
    assert.ok(res.body.data.qr.sentAt);
    assert.equal(res.body.data.qr.token, Q.token, 'bhejne se token nahi badalta');
    assert.deepEqual(res.body.data.meeting.events.at(-1).type, 'QR_SENT');
    assert.equal(res.body.data.meeting.events.at(-1).detail, 'share');
  });

  test('regenerate: naya token, purana hash DB se gaya, status wapas SCHEDULED', async () => {
    const oldHash = await hashInDb(Q.id);
    const res = await call('POST', `/meetings/${Q.id}/qr/regenerate`, A.admin);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.qr.version, 2);
    assert.notEqual(res.body.data.qr.token, Q.token);
    assert.equal(res.body.data.qr.sentAt, null);
    assert.equal(res.body.data.meeting.status, 'SCHEDULED');
    assert.equal(await Meeting.countDocuments({ 'qr.tokenHash': oldHash }), 0);
    Q.token = res.body.data.qr.token;
    assert.equal((await call('POST', `/meetings/${Q.id}/qr/regenerate`, B.admin)).status, 404);
  });

  test('time badalne par expiry badalti hai (token wahi); sales manager badalne par naya QR', async () => {
    let res = await call('PUT', `/meetings/${Q.id}`, A.admin, { date: day, startTime: '14:00', endTime: '15:30' });
    assert.equal(res.body.data.meeting.qr.expiresAt, `${day}T10:15:00.000Z`, 'end 15:30 IST + 15 min');
    assert.equal((await qrOf(Q.id)).token, Q.token);

    await call('POST', `/meetings/${Q.id}/qr/sent`, A.admin, {});
    res = await call('PUT', `/meetings/${Q.id}`, A.admin, { salesManagerId: Q.mohanId });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.meeting.qr.version, 3);
    assert.equal(res.body.data.meeting.status, 'SCHEDULED', 'naye sales manager ko dobara bhejna hai');
    assert.equal(res.body.data.meeting.events.at(-1).type, 'QR_GENERATED');
    const qr = await qrOf(Q.id);
    assert.notEqual(qr.token, Q.token);
    assert.equal(qr.sentAt, null);

    // Wahi sales manager dobara bhejne par QR nahi badalta
    res = await call('PUT', `/meetings/${Q.id}`, A.admin, { salesManagerId: Q.mohanId, title: 'Naya title' });
    assert.equal(res.body.data.meeting.qr.version, 3);
  });

  test('cancel / check-in ke baad QR nahi milta, na dobara banta hai', async () => {
    await call('PATCH', `/meetings/${Q.id}/cancel`, A.admin, {});
    const checkedIn = (await call('GET', '/meetings?status=CHECKED_IN', A.admin)).body.data.items[0];
    for (const id of [Q.id, checkedIn._id]) {
      assert.equal((await call('GET', `/meetings/${id}/qr`, A.admin)).status, 409);
      assert.equal((await call('POST', `/meetings/${id}/qr/regenerate`, A.admin)).status, 409);
      assert.equal((await call('POST', `/meetings/${id}/qr/sent`, A.admin, {})).status, 409);
    }
  });

  test('QR aane se pehle bani meeting: pehli baar maangne par QR ban jata hai', async () => {
    const source = await Meeting.findById(Q.id).lean();
    const legacy = await Meeting.create({
      companyId: source.companyId,
      clientId: source.clientId,
      salesManagerId: A.staffId,
      title: 'Purani meeting',
      date: day,
      startAt: zonedTime(day, '17:00'),
      endAt: zonedTime(day, '18:00'),
      location: source.location,
      createdBy: A.adminId,
    });
    assert.equal(legacy.qr.tokenHash, undefined);
    const qr = await qrOf(legacy._id);
    assert.match(qr.token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(qr.expiresAt, `${day}T12:45:00.000Z`);
    assert.equal((await qrOf(legacy._id)).token, qr.token);
    assert.match(await hashInDb(legacy._id), /^[0-9a-f]{64}$/);
  });
});
