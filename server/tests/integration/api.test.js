import '../setup.js';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { startTestServer } from '../helpers.js';
import { Attendance } from '../../models/Attendance.js';
import { LeaveBalance } from '../../models/LeaveBalance.js';
import { User } from '../../models/User.js';
import { markMissedPunchOuts } from '../../services/attendanceService.js';
import { daysOfMonth, todayStr, weekdayOf } from '../../utils/dateUtil.js';

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
    assert.equal(approved.body.data.items[0].userId.employeeCode, 'E1');
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
