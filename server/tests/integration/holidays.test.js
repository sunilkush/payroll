import './holidays.env.js';
import '../setup.js';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { startTestServer } from '../helpers.js';
import { User } from '../../models/User.js';
import { pushOutbox } from '../../services/pushService.js';
import { addDays, daysOfMonth, todayStr, weekdayOf } from '../../utils/dateUtil.js';

// Holidays: type, branch wali holidays, staff ki branch aur GET /holidays.

const today = todayStr();
const month = today.slice(0, 7);
const prevMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 2, 1)).toISOString().slice(0, 7);
// Pichhle mahine ke do working din (Sunday nahi): ek saari branches ki holiday, ek sirf Branch B ki
const [ALL_DAY, BRANCH_DAY] = daysOfMonth(prevMonth).filter((date) => weekdayOf(date) !== 0).slice(3, 5);
// Aage ke do lagatar working din (leave ke liye), dusra Branch B ki holiday
let future = addDays(today, 10);
while (weekdayOf(future) === 0 || weekdayOf(addDays(future, 1)) === 0 || future.slice(0, 4) !== addDays(future, 1).slice(0, 4)) future = addDays(future, 1);
const FUTURE_1 = future;
const FUTURE_2 = addDays(future, 1);

let api;
const T = {}; // { admin, staffA, staffB, branchA, branchB, staffAId, staffBId }

const call = (method, path, token, body) => api.call(path, { method, token, body });

before(async () => {
  api = await startTestServer();
  await User.create({ name: 'Super Admin', email: 'super@holidays.test', password: 'SuperAdmin@1', role: 'SUPER_ADMIN' });
  const superAdmin = await api.login('super@holidays.test', 'SuperAdmin@1');
  const created = await call('POST', '/companies', superAdmin, {
    name: 'Holiday Test Co',
    address: 'Gurugram',
    admin: { name: 'Admin', email: 'admin@holidays.test', phone: '9876543210', password: 'Password@1' },
  });
  assert.equal(created.status, 201);
  T.admin = await api.login('admin@holidays.test');

  const settings = await call('PUT', '/settings', T.admin, {
    locations: [
      { name: 'Branch A', lat: 28.4595, lng: 77.0266, radius: 100 },
      { name: 'Branch B', lat: 19.076, lng: 72.8777, radius: 100 },
    ],
    settings: { weekOffDays: [0], leaveEnabled: true },
  });
  assert.equal(settings.status, 200);
  [T.branchA, T.branchB] = settings.body.data.company.locations.map((location) => location._id);

  const staff = (key, branchId) => ({
    name: `Staff ${key}`,
    email: `${key}@holidays.test`,
    password: 'Password@1',
    employeeCode: key.toUpperCase(),
    joiningDate: `${prevMonth}-01`,
    salaryStructure: { basic: 15000 },
    branchId,
  });
  const a = await call('POST', '/staff', T.admin, staff('a', T.branchA));
  const b = await call('POST', '/staff', T.admin, staff('b', T.branchB));
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  assert.equal(b.body.data.staff.branchId, T.branchB);
  T.staffAId = a.body.data.staff._id;
  T.staffBId = b.body.data.staff._id;
  // Attendance account banne ke din se ginti hai: pichhle mahine ke din dekhne ke liye account purana karo
  // (createdAt mongoose mein immutable hai, isliye seedha collection par)
  await User.collection.updateMany({ role: 'STAFF' }, { $set: { createdAt: new Date(`${prevMonth}-01T00:00:00Z`) } });
  T.staffA = await api.login('a@holidays.test');
  T.staffB = await api.login('b@holidays.test');
});

after(async () => {
  await api.stop();
});

describe('holidays: type aur branch', () => {
  test('holiday type + branches save hote hain; galat branch par field error', async () => {
    const holidays = [
      { date: ALL_DAY, name: 'Republic Day', type: 'NATIONAL' },
      { date: BRANCH_DAY, name: 'Ganesh Chaturthi', type: 'FESTIVAL', branchIds: [T.branchB] },
      { date: FUTURE_2, name: 'Branch B Day', type: 'COMPANY', branchIds: [T.branchB] },
    ];
    const res = await call('PUT', '/settings', T.admin, { holidays });
    assert.equal(res.status, 200);
    const saved = res.body.data.company.holidays;
    assert.equal(saved.find((item) => item.date === ALL_DAY).type, 'NATIONAL');
    assert.deepEqual(saved.find((item) => item.date === ALL_DAY).branchIds, [], 'branch na do to saari branches');
    assert.deepEqual(saved.find((item) => item.date === BRANCH_DAY).branchIds, [T.branchB]);

    const wrong = await call('PUT', '/settings', T.admin, {
      holidays: [{ date: ALL_DAY, name: 'Some day', branchIds: ['0123456789abcdef01234567'] }],
    });
    assert.equal(wrong.status, 400);
    assert.ok(wrong.body.errors.some((item) => item.field === 'holidays.0.branchIds'));

    assert.equal((await call('PUT', '/settings', T.admin, { holidays: [{ date: ALL_DAY, name: 'Some day', type: 'OTHER' }] })).status, 400);
  });

  test('purani holiday (bina type / branch) default: COMPANY, saari branches', async () => {
    const res = await call('PUT', '/settings', T.admin, {
      holidays: [
        { date: ALL_DAY, name: 'Republic Day', type: 'NATIONAL' },
        { date: BRANCH_DAY, name: 'Ganesh Chaturthi', type: 'FESTIVAL', branchIds: [T.branchB] },
        { date: FUTURE_2, name: 'Branch B Day', branchIds: [T.branchB] },
        { date: `${prevMonth}-28`, name: 'Old style' },
      ],
    });
    const old = res.body.data.company.holidays.find((item) => item.name === 'Old style');
    assert.equal(old.type, 'COMPANY');
    assert.deepEqual(old.branchIds, []);
  });

  test('GET /holidays: staff ko apni branch wali, admin ko saari + branches', async () => {
    const year = Number(prevMonth.slice(0, 4));
    const a = (await call('GET', `/holidays?year=${year}`, T.staffA)).body.data;
    const b = (await call('GET', `/holidays?year=${year}`, T.staffB)).body.data;
    const admin = (await call('GET', `/holidays?year=${year}`, T.admin)).body.data;

    assert.ok(a.holidays.some((item) => item.date === ALL_DAY));
    assert.ok(!a.holidays.some((item) => item.date === BRANCH_DAY), 'Branch A ko Branch B ki holiday nahi');
    assert.ok(b.holidays.some((item) => item.date === BRANCH_DAY));
    assert.ok(admin.holidays.some((item) => item.date === BRANCH_DAY));
    assert.deepEqual(admin.weekOffDays, [0]);
    assert.deepEqual(admin.branches.map((branch) => branch.name), ['Branch A', 'Branch B']);
    assert.ok(a.holidays.every((item) => item.date.startsWith(`${year}-`)));
    assert.equal((await call('GET', '/holidays?year=1990', T.staffA)).status, 400);
  });

  test('attendance: branch ki holiday sirf us branch ke staff ke liye HOLIDAY, baaki ke liye absent', async () => {
    const dayOf = async (token) =>
      Object.fromEntries((await call('GET', `/attendance?month=${prevMonth}`, token)).body.data.days.map((day) => [day.date, day.status]));
    const a = await dayOf(T.staffA);
    const b = await dayOf(T.staffB);
    assert.equal(a[ALL_DAY], 'HOLIDAY');
    assert.equal(b[ALL_DAY], 'HOLIDAY');
    assert.equal(b[BRANCH_DAY], 'HOLIDAY');
    assert.equal(a[BRANCH_DAY], 'ABSENT');
  });

  test('leave: branch ki holiday us branch ke staff ki leave mein nahi ginti', async () => {
    const body = { type: 'CL', fromDate: FUTURE_1, toDate: FUTURE_2, reason: 'Family function' };
    const b = await call('POST', '/leaves', T.staffB, body);
    assert.equal(b.status, 201);
    assert.equal(b.body.data.leave.days, 1, 'FUTURE_2 Branch B ki holiday hai');
    const a = await call('POST', '/leaves', T.staffA, body);
    // Branch A ke liye dono din working: 2 din chahiye, balance kam hai
    assert.equal(a.status, 400);
    assert.match(a.body.message, /required 2/);
  });

  test('staff ki branch company ki location honi chahiye', async () => {
    const res = await call('PUT', `/staff/${T.staffAId}`, T.admin, { branchId: '0123456789abcdef01234567' });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.some((item) => item.field === 'branchId'));
    assert.equal((await call('PUT', `/staff/${T.staffAId}`, T.admin, { branchId: null })).body.data.staff.branchId, null);
    assert.equal((await call('PUT', `/staff/${T.staffAId}`, T.admin, { branchId: T.branchA })).status, 200);
  });

  test('jo branch holiday ya staff ke kaam aa rahi hai wo hat nahi sakti', async () => {
    const { locations } = (await call('GET', '/settings', T.admin)).body.data.company;
    const onlyA = locations.filter((location) => location._id === T.branchA);
    const res = await call('PUT', '/settings', T.admin, { locations: onlyA });
    assert.equal(res.status, 409);
    assert.match(res.body.message, /Branch B/);

    // Holidays se hata do: ab staff ki wajah se ruke
    await call('PUT', '/settings', T.admin, { holidays: [{ date: ALL_DAY, name: 'Republic Day', type: 'NATIONAL' }] });
    const staffBlock = await call('PUT', '/settings', T.admin, { locations: onlyA });
    assert.equal(staffBlock.status, 409);
    assert.match(staffBlock.body.message, /assigned to "Branch B"/);

    // Staff ko bhi hata do: ab location hat jati hai
    await call('PUT', `/staff/${T.staffBId}`, T.admin, { branchId: null });
    assert.equal((await call('PUT', '/settings', T.admin, { locations: onlyA })).status, 200);
  });
});

describe('payroll finalize: slip ki push notification', () => {
  test('jinki draft final hui unke phone par "Salary slip ready", data.screen = salary', async () => {
    const PUSH = 'ExponentPushToken[holiday-staff-b]';
    const login = await call('POST', '/auth/login', null, { email: 'b@holidays.test', password: 'Password@1', deviceId: 'device-holiday-b', platform: 'android' });
    await call('PUT', '/auth/push-token', login.body.data.token, { deviceId: 'device-holiday-b', pushToken: PUSH });

    assert.equal((await call('POST', '/payroll/generate', T.admin, { month: prevMonth })).status, 200);
    pushOutbox.length = 0;
    assert.equal((await call('POST', '/payroll/finalize', T.admin, { month: prevMonth })).status, 200);
    // Push await nahi hoti: thoda ruko
    for (let tries = 0; tries < 20 && !pushOutbox.length; tries += 1) await new Promise((resolve) => setTimeout(resolve, 50));
    const message = pushOutbox.find((item) => item.to === PUSH);
    assert.ok(message, 'staff B ko slip ki notification');
    assert.equal(message.data.screen, 'salary');
    assert.match(message.title, /Salary slip/);
  });
});
