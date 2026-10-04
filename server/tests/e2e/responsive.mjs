// Rule 10 ka check: har page ko asli browser mein 360px, 768px aur 1366px par kholta hai.
//
//   npm run test:responsive        (root se; pehle client build karta hai)
//
// Kya check hota hai, har page aur har size par:
//   - page daayein-baayein scroll nahi hota (koi cheez screen se bahar nahi)
//   - 1366 par sidebar dikhta hai; 360 aur 768 par hamburger (aur drawer khulta hai)
//   - 360 par buttons/inputs ungli se dabane layak (36px+) hain
//   - browser console mein koi error nahi
// Saath hi staff ka punch in/out asli (nakli GPS wale) browser mein chalta hai.
// Har page ka screenshot tests/e2e/screenshots/ mein aata hai, aankh se dekhne ke liye.
//
// Test database (payroll_test) par chalta hai. Browser: installed Edge ya Chrome
// (BROWSER_CHANNEL=chrome se badal sakte ho).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

process.env.SERVE_CLIENT = 'true';
const { startTestServer } = await import('../helpers.js');
const { Attendance } = await import('../../models/Attendance.js');
const { User } = await import('../../models/User.js');
const { daysOfMonth, todayStr, weekdayOf } = await import('../../utils/dateUtil.js');

const here = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(here, 'screenshots');
const VIEWPORTS = [
  { name: '360', width: 360, height: 740, mobile: true },
  { name: '768', width: 768, height: 1024, mobile: true },
  { name: '1366', width: 1366, height: 768, mobile: false },
];
const OFFICE = { lat: 28.4595, lng: 77.0266 };
const INSIDE = { latitude: 28.4599, longitude: 77.0266, accuracy: 20 };
const OUTSIDE = { latitude: 28.4616, longitude: 77.0266, accuracy: 20 };

if (!fs.existsSync(path.join(here, '../../../client/dist/index.html'))) {
  console.error('client/dist nahi mila. Pehle "npm run build" chalao (ya root se "npm run test:responsive").');
  process.exit(1);
}
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });

const failures = [];
const fail = (where, message) => {
  failures.push(`${where}: ${message}`);
  console.log(`  FAIL ${where}: ${message}`);
};

// ---------- Data: ek company jisme har screen par kuch dikhne layak ho ----------
const api = await startTestServer();
const today = todayStr();
const month = today.slice(0, 7);
const prevMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 2, 1)).toISOString().slice(0, 7);

await User.create({ name: 'Super Admin', email: 'super@test.local', password: 'SuperAdmin@1', role: 'SUPER_ADMIN' });
const superAdmin = await api.login('super@test.local', 'SuperAdmin@1');
const post = (url, token, body, method = 'POST') => api.call(url, { method, token, body });

const created = await post('/companies', superAdmin, {
  name: 'Shree Balaji Engineering Works Pvt Ltd',
  address: 'Plot 12, Sector 44, Industrial Area, Gurugram, Haryana 122003',
  admin: { name: 'Rajesh Kumar Sharma', email: 'admin@balaji.test', phone: '9876543210', password: 'Password@1' },
});
const companyId = created.body.data.company._id;
await post('/companies', superAdmin, { name: 'Om Traders', address: 'Faridabad' });
const admin = await api.login('admin@balaji.test');
await post('/settings', admin, {
  locations: [{ name: 'Head Office', ...OFFICE, radius: 100 }],
  holidays: [{ date: `${prevMonth}-02`, name: 'Company Foundation Day' }],
  settings: { leaveEnabled: true, allowPastLeave: true, pfEnabled: true, esiEnabled: true },
}, 'PUT');

const people = [
  ['Ravi Kumar', 'ravi', 15000, 5000],
  ['Sunita Devi Chaudhary', 'sunita', 12000, 6000],
  ['Mohammed Imran Ansari', 'imran', 30000, 20000],
];
const staffIds = [];
for (const [index, [name, key, basic, hra]] of people.entries()) {
  const res = await post('/staff', admin, {
    name,
    email: `${key}.staff@balaji-engineering.test`,
    phone: '9876500000',
    password: 'Password@1',
    employeeCode: `EMP00${index + 1}`,
    joiningDate: `${prevMonth}-01`,
    salaryStructure: { basic, hra, special: 1500 },
    pfApplicable: true,
    esiApplicable: true,
    uan: '123456789012',
    esicNo: '1234567890',
    bankDetails: { accountNo: '123456789012', ifsc: 'SBIN0001234', bankName: 'State Bank of India' },
  });
  staffIds.push(res.body.data.staff._id);
}
const staff = await api.login('ravi.staff@balaji-engineering.test');

// Ravi: pichhle mahine se system mein, 3 din chhod kar baaki working days present
await User.collection.updateOne({ email: 'ravi.staff@balaji-engineering.test' }, { $set: { createdAt: new Date(`${prevMonth}-01T00:00:00Z`) } });
const working = daysOfMonth(prevMonth).filter((date) => date !== `${prevMonth}-02` && weekdayOf(date) !== 0);
const punch = (hour) => ({ time: new Date(`${prevMonth}-10T${hour}:30:00+05:30`), lat: OFFICE.lat, lng: OFFICE.lng, distance: 18, locationName: 'Head Office' });
await Attendance.insertMany(
  working.slice(3).map((date, index) => ({
    companyId,
    userId: staffIds[0],
    date,
    punchIn: punch('09'),
    ...(index === 0 ? { missedPunchOut: true } : { punchOut: punch('18') }),
  }))
);
const leave = (date, reason) => post('/leaves', staff, { type: 'CL', fromDate: date, toDate: date, reason });
const approved = await leave(working[0], 'Ghar par zaroori kaam hai');
await post(`/leaves/${approved.body.data.leave._id}/approve`, admin, { note: 'Theek hai' }, 'PATCH');
await post('/leaves', staff, { type: 'EL', fromDate: working[1], toDate: working[1], reason: 'Gaon jaana hai, shaadi mein shaamil hona hai' });

await post('/payroll/generate', admin, { month: prevMonth });
await post('/payroll/finalize', admin, { month: prevMonth });
await post('/payroll/generate', admin, { month });

// ---------- Kaun sa role kaun se pages ----------
const ROLES = [
  {
    role: 'superadmin',
    token: superAdmin,
    pages: [
      ['dashboard', '/superadmin'],
      ['companies', '/superadmin/companies'],
      ['company-detail', `/superadmin/companies/${companyId}`],
      ['global-settings', '/superadmin/settings'],
    ],
  },
  {
    role: 'admin',
    token: admin,
    pages: [
      ['dashboard', '/admin'],
      ['staff', '/admin/staff'],
      ['staff-new', '/admin/staff/new'],
      ['staff-edit', `/admin/staff/${staffIds[0]}`],
      ['attendance', `/admin/attendance?month=${prevMonth}`],
      ['attendance-staff', `/admin/attendance/${staffIds[0]}?month=${prevMonth}`],
      ['leaves', '/admin/leaves'],
      ['payroll', '/admin/payroll'],
      ['settings', '/admin/settings'],
    ],
  },
  {
    role: 'staff',
    token: staff,
    pages: [
      ['dashboard', '/staff'],
      ['punch', '/staff/punch'],
      ['attendance', '/staff/attendance'],
      ['leaves', '/staff/leaves'],
      ['salary', '/staff/salary'],
    ],
  },
];

// ---------- Browser helpers ----------
async function launch() {
  const channels = [process.env.BROWSER_CHANNEL, 'msedge', 'chrome'].filter(Boolean);
  for (const channel of channels) {
    try {
      return await chromium.launch({ channel });
    } catch {
      /* agla browser try karo */
    }
  }
  throw new Error('Edge ya Chrome nahi mila. BROWSER_CHANNEL set karo.');
}

async function newPage(browser, viewport, token, where) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    permissions: ['geolocation'],
    geolocation: INSIDE,
  });
  if (token) await context.addInitScript((value) => localStorage.setItem('payroll_token', value), token);
  const page = await context.newPage();
  page.on('console', (message) => {
    // Range ke bahar punch jaan-boojh kar karte hain; uska 403 browser console mein aata hi hai.
    const expected = where().includes('punch-flow') && message.text().includes('403');
    if (message.type() === 'error' && !expected) fail(where(), `console error: ${message.text()}`);
  });
  page.on('pageerror', (error) => fail(where(), `page error: ${error.message}`));
  return { context, page };
}

// fullPage false: sirf jo screen par dikh raha hai (drawer/modal jaise overlays ke liye)
const shot = (page, name, fullPage = true) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage });

// Page ke andar chalne wale checks
async function checkLayout(page, viewport, where, { loggedIn = true } = {}) {
  const result = await page.evaluate(() => {
    const visible = (element) => {
      if (!element) return false;
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && getComputedStyle(element).visibility !== 'hidden';
    };
    // Ant Design controls ka bahari dabba naapte hain (andar ka <input> chhota hota hai)
    const small = [...document.querySelectorAll('.ant-btn, .ant-input-affix-wrapper, input.ant-input, textarea.ant-input, .ant-select, .ant-picker, .ant-menu-item')]
      .filter((element) => !element.closest('.ant-input-affix-wrapper') || element.classList.contains('ant-input-affix-wrapper'))
      .filter(visible)
      .map((element) => ({ height: Math.round(element.getBoundingClientRect().height), label: (element.textContent || element.getAttribute('aria-label') || element.name || element.tagName).trim().slice(0, 30) }))
      .filter((item) => item.height < 36);
    return {
      // Desktop par table apne dabbe ke andar daayein-baayein scroll na kare (columns sama jayein)
      tableScroll: [...document.querySelectorAll('.ant-table-content')].some((table) => table.scrollWidth > table.clientWidth + 1),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      sidebar: visible(document.querySelector('.app-layout__sidebar')),
      hamburger: visible(document.querySelector('.navbar__menu')),
      small,
    };
  });

  if (result.overflow > 1) fail(where, `page ${result.overflow}px daayein-baayein scroll hota hai`);
  if (result.tableScroll) fail(where, 'table apne dabbe mein daayein-baayein scroll ho rahi hai');
  if (loggedIn) {
    const desktop = viewport.width >= 992;
    if (result.sidebar !== desktop) fail(where, `sidebar ${desktop ? 'dikhna chahiye' : 'nahi dikhna chahiye'}`);
    if (result.hamburger === desktop) fail(where, `hamburger ${desktop ? 'nahi dikhna chahiye' : 'dikhna chahiye'}`);
  }
  if (viewport.width < 768) {
    for (const item of result.small) fail(where, `"${item.label}" sirf ${item.height}px ooncha hai (ungli se dabana mushkil)`);
  }
}

// ---------- Run ----------
const browser = await launch();
let pagesChecked = 0;

try {
  for (const viewport of VIEWPORTS) {
    console.log(`\n== ${viewport.name}px ==`);

    // Login page (bina token) + form bhar kar asli login
    {
      let current = `login@${viewport.name}`;
      const { context, page } = await newPage(browser, viewport, null, () => current);
      await page.goto(`${api.origin}/login`, { waitUntil: 'networkidle' });
      await checkLayout(page, viewport, current, { loggedIn: false });
      await shot(page, `${viewport.name}-login`);
      await page.fill('#email', 'ravi.staff@balaji-engineering.test');
      await page.fill('#password', 'Password@1');
      await page.click('button[type=submit]');
      await page.waitForURL('**/staff', { timeout: 10000 }).catch(() => fail(current, 'login ke baad /staff par nahi gaya'));
      pagesChecked += 1;
      await context.close();
    }

    for (const { role, token, pages } of ROLES) {
      let current = '';
      const { context, page } = await newPage(browser, viewport, token, () => current);

      for (const [name, url] of pages) {
        current = `${role}/${name}@${viewport.name}`;
        await page.goto(api.origin + url, { waitUntil: 'networkidle' });
        await page.waitForSelector('.app-layout__content h1', { timeout: 10000 }).catch(() => fail(current, 'page load nahi hua (h1 nahi mila)'));
        await checkLayout(page, viewport, current);
        await shot(page, `${viewport.name}-${role}-${name}`);
        pagesChecked += 1;
      }

      // Drawer: chhoti screen par hamburger se khule, link dabane par band ho
      if (viewport.width < 992) {
        current = `${role}/drawer@${viewport.name}`;
        await page.click('.navbar__menu');
        await page.waitForSelector('.ant-drawer-content-wrapper');
        await page.waitForTimeout(350); // slide animation poora hone do
        await checkLayout(page, viewport, current);
        await shot(page, `${viewport.name}-${role}-drawer`, false);
        await page.click('.ant-drawer .ant-menu-item a >> nth=0');
        await page.waitForSelector('.ant-drawer-content-wrapper', { state: 'hidden', timeout: 5000 }).catch(() => fail(current, 'link dabane par drawer band nahi hua'));
      }

      // Modals
      if (role === 'superadmin') {
        current = `superadmin/new-company-modal@${viewport.name}`;
        await page.goto(`${api.origin}/superadmin/companies`, { waitUntil: 'networkidle' });
        await page.click('text=+ New Company');
        await page.waitForSelector('.ant-modal-container, .ant-modal-content');
        await page.waitForTimeout(500); // modal khulne ka animation
        await checkLayout(page, viewport, current);
        await shot(page, `${viewport.name}-superadmin-new-company-modal`);
      }
      if (role === 'admin') {
        current = `admin/salary-slip-modal@${viewport.name}`;
        await page.goto(`${api.origin}/admin/payroll`, { waitUntil: 'networkidle' });
        await page.click('.payroll__actions >> text=View >> nth=0');
        await page.waitForSelector('.salary-slip');
        await page.waitForTimeout(500); // modal khulne ka animation
        await checkLayout(page, viewport, current);
        await shot(page, `${viewport.name}-admin-salary-slip-modal`);
      }
      if (role === 'staff') {
        current = `staff/apply-leave-modal@${viewport.name}`;
        await page.goto(`${api.origin}/staff/leaves`, { waitUntil: 'networkidle' });
        await page.click('text=+ Apply Leave');
        await page.waitForSelector('.ant-modal-container, .ant-modal-content');
        await page.waitForTimeout(500); // modal khulne ka animation
        await checkLayout(page, viewport, current);
        await shot(page, `${viewport.name}-staff-apply-leave-modal`);

        current = `staff/salary-slip-modal@${viewport.name}`;
        await page.goto(`${api.origin}/staff/salary`, { waitUntil: 'networkidle' });
        await page.click('.my-salary__actions >> text=View');
        await page.waitForSelector('.salary-slip');
        await page.waitForTimeout(500); // modal khulne ka animation
        await checkLayout(page, viewport, current);
        await shot(page, `${viewport.name}-staff-salary-slip-modal`);
      }

      // Punch: sirf phone size par, asli button daba kar (GPS nakli hai)
      if (role === 'staff' && viewport.name === '360') {
        current = 'staff/punch-flow@360';
        const message = () => page.locator('.punch-screen .alert').innerText({ timeout: 10000 }).catch(() => '');
        await page.goto(`${api.origin}/staff/punch`, { waitUntil: 'networkidle' });

        await context.setGeolocation(OUTSIDE);
        await page.click('.punch-screen__button');
        const outside = await message();
        if (!/office range se bahar/.test(outside)) fail(current, `range ke bahar ka message nahi aaya: "${outside}"`);
        await shot(page, '360-staff-punch-outside-range');

        await context.setGeolocation(INSIDE);
        await page.click('.punch-screen__button');
        await page.waitForSelector('.punch-screen__button--out', { timeout: 10000 }).catch(() => fail(current, 'punch in nahi hua'));
        await page.waitForTimeout(500); // button ka rang hare se laal hone ka animation poora ho
        const punchOutColor = await page.locator('.punch-screen__button').evaluate((el) => getComputedStyle(el).backgroundColor);
        const [red, green] = punchOutColor.match(/\d+/g).map(Number);
        if (green >= red) fail(current, `Punch Out button laal nahi hai (${punchOutColor})`);
        await shot(page, '360-staff-punch-after-in');

        await page.click('.punch-screen__button');
        await page.waitForSelector('.punch-screen__button', { state: 'detached', timeout: 10000 }).catch(() => fail(current, 'punch out nahi hua'));
        await checkLayout(page, viewport, current);
        await shot(page, '360-staff-punch-after-out');
        const saved = await Attendance.findOne({ userId: staffIds[0], date: today });
        if (!saved?.punchOut) fail(current, 'database mein punch in/out save nahi hua');
      }

      await context.close();
    }
  }
} finally {
  await browser.close();
  await api.stop();
}

console.log(`\n${pagesChecked} page-views check hue (${VIEWPORTS.map((v) => v.name).join(' / ')}px). Screenshots: ${path.relative(process.cwd(), SHOTS)}`);
if (failures.length) {
  console.log(`${failures.length} problem(s):`);
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Sab theek: koi overflow nahi, layout sahi, console saaf.');
}
