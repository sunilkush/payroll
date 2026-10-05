# Payroll Web Application

Multi-tenant payroll app: React (Vite) + Node/Express (MVC) + MongoDB + JWT.
Poora plan aur project rules: `Payroll_App_Plan.docx`.

Roles: **Super Admin** (companies, global PF/ESI rates), **Company Admin** (staff, attendance,
leave, payroll, settings), **Staff** (punch in/out, leave, salary slip).

## Structure

```
server/   Express API  (config, models, controllers, services, routes, middlewares, validators, jobs, utils, tests)
client/   Vite + React (api, components, pages, context, routes, styles)
deploy/   Nginx config ka example
```

## Local setup

Zaroorat: Node 20+, MongoDB chalu ho.

```bash
npm run install:all

cp server/.env.example server/.env    # JWT_SECRET aur SUPER_ADMIN_* bharo
npm run seed:superadmin               # pehla Super Admin banata hai

npm run dev:server                    # http://localhost:5000
npm run dev:client                    # doosre terminal mein, http://localhost:5173
```

App ko bhara hua dekhna ho to demo data daal sakte ho (2 companies, staff, pichhle mahine ki
attendance, leaves aur payroll; sab nakli):

```bash
npm run seed:demo                     # logins aur password script ke end mein print hote hain
```

Shuru karne ka order: Super Admin login -> company + admin banao -> admin login -> Settings mein
office location (aur chaho to Leave / PF / ESI ON) -> staff add karo -> staff login karke punch kare.

## Tests

```bash
npm test                # server ke saare tests (unit + API)
```

- Unit tests: geofence (Haversine), PF/ESI, 30-day salary calculation, date helpers.
- API tests: login se payroll tak poora flow, role checks aur do companies ke beech data isolation.
- Tests **alag database** (`payroll_test`) par chalte hain aur use har run par khali karte hain.
  Asli database ko nahi chhute. Doosra DB dena ho to `TEST_MONGO_URI` set karo (naam `_test` par
  khatam hona zaroori hai).

## Design system

Modern SaaS dashboard style: halka gray background, safed cards (patla border, bahut halki parchhai,
12px gol kone), ek hi primary rang (indigo), Inter font (body 14px), 8px spacing. Sab kuch
`client/src/styles/variables.css` mein hai; wahan badalne se poora app badalta hai.

- **Sidebar:** halka, group-wise menu (Overview / People / Finance / Configuration), chhota (sirf
  icons) ho sakta hai, neeche user ki profile. Phone/tablet par drawer.
- **Top bar:** breadcrumb, global search (Ctrl+K; pages, aur admin ke liye staff / Super Admin ke liye
  companies), "+ New" quick actions, notifications ki ghanti, user menu.
- **Dashboards** (teeno roles): KPI cards (pichhle period se tulna + sparkline), charts, aaj ki
  sortable table, pending requests, aane wale din, activity. Data ek hi read-only API se aata hai:
  `GET /api/v1/dashboard` (role ke hisaab se) aur `GET /api/v1/dashboard/notifications`.

Dashboard ke reusable components: `StatCard` / `StatGrid`, `ChartCard`, `Charts` (`AreaTrend`,
`BarTrend`, `Donut`, `Sparkline`; Recharts par), `DataTable` (search + sorting + pagination, phone par
daayein-baayein khiskti hai), `ListCard`, `EmptyState`, `WelcomeHeader`, `DashboardRow`,
`GlobalSearch`, `NotificationPanel`.

## UI: Ant Design

UI [Ant Design](https://ant.design) (v6) se bani hai. Pages seedhe Ant Design ke saath-saath
`client/src/components/` ke chhote wrappers use karte hain, taaki har jagah ek jaisa dikhe:

| Hamara component | Andar Ant Design ka |
|---|---|
| `Button`, `FormField`, `Checkbox`, `MonthPicker` | Button, Input / Select / TextArea, Checkbox, DatePicker |
| `ListToolbar` (type karte hi search + ginti wale status tabs) | Input, Segmented |
| `UserCell` (avatar + naam + chhoti line) | Avatar |
| `FormActions` (lambe form ka neeche chipka Save bar) | - |
| `Modal`, `Drawer`, `Alert`, `Badge`, `Loader`, `Pagination` | Modal, Drawer, Alert, Tag, Spin, Pagination |
| `Table` | Desktop: Table. Mobile/tablet: Card + Descriptions |
| `AppLayout`, `Navbar`, `NavMenu` | Layout, Sider, Menu |
| `SummaryTiles`, `RoleHome` | Card, Statistic |

- **Rang aur font** ek hi jagah hain: `client/src/styles/variables.css`. Ant Design ka theme
  (`styles/theme.js`) wahin se padhta hai, isliye wahan rang badalne se poora app badalta hai.
- **Inline style ab bhi nahi** (Rule 2). Ant Design component ko badalna ho to us page/component ki
  `.css` file mein class se badlo.
- **Feedback ka ek hi tareeka:** `useFeedback()` (`utils/useFeedback.js`) se `toast.success(...)` /
  `toast.error(...)` aur `await confirm({ title, content, okText, danger })`. Browser ke
  `window.confirm` / `alert` use mat karo.
- Naya page banate waqt table ke liye hamara `Table` hi use karo (seedha Ant Design ka nahi),
  warna phone par cards nahi banenge.

## Responsive (Rule 10: mobile-first)

Har page pehle phone ke liye banta hai, phir badi screen ke liye badalta hai. Breakpoints
`client/src/styles/variables.css` ke upar likhe hain:

| Screen | Layout |
|---|---|
| Mobile (360px se) | Hamburger + drawer menu, tables ki jagah cards, forms ek column |
| Tablet (768px se) | Hamburger + drawer, cards 2 ek line mein, forms 2 column |
| Desktop (992px se, Ant Design ka `lg`) | Baayein sidebar, asli tables |

Content **full width (container-fluid)** hai: koi max chaudai nahi, sirf kinare ka gap. Isliye badi
screen (1600px+) par forms mein zyada columns ho jate hain, aur check 1920px par bhi chalta hai.

CSS likhne ka tareeka: pehle mobile ka style, phir `@media (min-width: ...)` se badi screen
(`max-width` nahi). Tables ke liye kuch alag nahi karna: `Table` component phone par apne aap
cards bana deta hai.

**Har page 360px, 768px aur 1366px par test hona zaroori hai:**

```bash
npm run test:responsive
```

Ye asli browser (installed Edge/Chrome) mein har role ka har page teeno sizes par kholta hai aur
check karta hai: page daayein-baayein scroll nahi hota, sahi menu (sidebar / hamburger) dikhta hai,
phone par buttons ungli se dabane layak hain, console mein error nahi. Staff ka punch in/out bhi
phone size par asli button daba kar chalta hai. Screenshots `server/tests/e2e/screenshots/` mein
aate hain: naya page banane ke baad unhe ek baar aankh se zaroor dekho, layout "sahi dikhna"
script nahi bata sakti.

Naya page jodo to use `server/tests/e2e/responsive.mjs` ki `ROLES` list mein bhi daal do.

## Naya protected route kaise jode

```js
router.use('/staff', auth, tenant, authorize(ROLES.ADMIN), staffRoutes);
```

- `auth` token check karke `req.user` set karta hai.
- `tenant` current company set karta hai. Jis model par `tenantPlugin` laga hai uski har
  query apne aap `companyId` se filter hoti hai, controller mein manually filter nahi likhna.
- `authorize(...roles)` role check karta hai.
- Naye tenant-scoped model mein `companyId` field rakho aur `schema.plugin(tenantPlugin)` lagao.

## Deployment (production)

**HTTPS zaroori hai.** Browser bina HTTPS ke location nahi deta, yaani punch in/out chalega hi nahi.

Production mein ek hi Node server API aur React build dono serve karta hai, aur uske aage Nginx
HTTPS sambhalta hai.

### 1. Server par code aur build

```bash
git clone <repo> && cd payroll
npm run install:all
npm run build                 # client/dist banata hai
```

### 2. `server/.env`

```ini
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://<user>:<password>@127.0.0.1:27017/payroll?authSource=admin
JWT_SECRET=<48+ random bytes>          # 32 characters se chhota ho to server start nahi hota
CLIENT_URL=https://payroll.example.com
TRUST_PROXY=1                          # Nginx ke peeche
APP_TIMEZONE=Asia/Kolkata
SUPER_ADMIN_EMAIL=...
SUPER_ADMIN_PASSWORD=...               # seed ke baad is line ko hata do
```

`NODE_ENV=production` hone par `FORCE_HTTPS` aur `SERVE_CLIENT` apne aap ON ho jate hain.

### 3. Pehla Super Admin aur server start

```bash
npm run seed:superadmin
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup       # reboot ke baad apne aap chale
```

Ek hi instance chalao: cron jobs (raat 11:59 auto punch-out, 1 tarikh ko leave credit) server ke
andar chalte hain.

### 4. Nginx + HTTPS certificate

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/payroll   # domain badlo
sudo ln -s /etc/nginx/sites-available/payroll /etc/nginx/sites-enabled/
sudo certbot --nginx -d payroll.example.com                            # free certificate + auto-renew
sudo nginx -t && sudo systemctl reload nginx
```

### 5. Check

- `https://payroll.example.com/api/v1/health` -> `{"success":true,"message":"OK"}`
- `http://...` kholne par `https://...` par chala jaye.
- Phone se staff login karke punch in try karo (location permission maangega).

### Naya version deploy karna

```bash
git pull && npm run install:all && npm run build && pm2 restart payroll
```

### Dhyan rakhne wali baatein

- **MongoDB** mein authentication ON rakho aur use internet par mat kholo (sirf `127.0.0.1`).
- **Backup:** roz `mongodump --uri "$MONGO_URI" --out /backups/$(date +%F)` ka cron lagao.
  Payroll aur attendance ka data dobara nahi ban sakta.
- **Server ka time** kuch bhi ho, attendance ki date aur cron `APP_TIMEZONE` se chalte hain.
- **PF/ESI rates** Super Admin ki Global Settings mein hain. Live jaane se pehle CA se confirm karo,
  khaaskar "PF wage floor (% of gross)".
- **Office location ka map** (admin Settings) OpenStreetMap se aata hai: map ki tiles
  `tile.openstreetmap.org` se aur place search `nominatim.openstreetmap.org` se. Dono free hain aur
  API key nahi chahiye, lekin server ke bahar internet zaroori hai, aur ye sirf halke use ke liye hain
  (bahut zyada users hon to apna tile/search provider lagana hoga). In dono ko `server/app.js` ke
  Content-Security-Policy mein ijazat di gayi hai.
- **Fake GPS** web browser par poori tarah nahi ruk sakta. Har punch ke saath IP aur device save
  hota hai, shak hone par wahi dekho.

## Phases

- [x] 1. Setup + Auth + Roles
- [x] 2. Super Admin module (Company CRUD, admin creation)
- [x] 3. Staff management
- [x] 4. Attendance (geofence punch)
- [x] 5. Leave (CL/EL)
- [x] 6. Payroll (30-day, PF/ESI, slip PDF, Excel)
- [x] 7. Testing + Deployment
