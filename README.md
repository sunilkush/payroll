# PayRoster

Multi-tenant attendance + payroll app (installable PWA): React (Vite) + Node/Express (MVC) + MongoDB + JWT.
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
attendance, leaves aur payroll, aur pehli company mein Sales meetings; sab nakli). Purana demo data
ho to ye sirf Sales ka hissa jod deta hai:

```bash
npm run seed:demo                     # logins aur password script ke end mein print hote hain
```

Shuru karne ka order: Super Admin login -> company + admin banao -> admin login -> Settings mein
office location (aur chaho to Leave / PF / ESI ON) -> staff add karo -> staff login karke punch kare.

## Server ka index page (Pug)

Backend ka apna ek chhota HTML page hai jo **Pug** template se banta hai: API chal rahi hai ya nahi,
version, environment, database ka haal.

- Dev mein: `http://localhost:5000/` (aur `/api`). Production mein `/` React app ka hai, isliye
  page sirf `/api` par milta hai.
- Files: `server/views/layout.pug` + `index.pug` (view), `controllers/homeController.js`,
  `services/statusService.js`, `routes/homeRoutes.js`, style `server/public/css/home.css`.
- Ye page bina login ke khulta hai, isliye isme koi secret ya andar ki detail mat jodo.
- Naya Pug page: `views/` mein file banao (`extends layout`), controller mein `res.render('naam', data)`.

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

**Tables mein pagination:** `Table` component 10 se zyada rows hone par apne aap pagination dikhata
hai (`pageSize` prop se badal sakte ho). Staff, Companies aur Leave jaisi lambi lists server se
page-wise aati hain aur apna `<Pagination>` alag lagati hain.

## PWA (install hone wala app)

Client ek Progressive Web App hai (`vite-plugin-pwa`, config `client/vite.config.js` mein):

- Phone par browser ke menu se **"Add to Home screen" / "Install app"**; desktop par address bar ka
  install icon. App phir apni window mein, bina browser bar ke khulta hai.
- App ka dhancha (HTML, JS, CSS, fonts, icons) phone mein cache hota hai, isliye turant khulta hai
  aur internet na ho tab bhi khul jata hai (upar "You are offline" ki patti aati hai).
- **API ka data cache nahi hota**: salary, attendance aur punch hamesha server se. Offline mein punch
  nahi hota.
- Naya build deploy hone par app agli baar khulte hi apne aap update ho jata hai.
- Service worker sirf build mein banta hai (`npm run build`), `npm run dev:client` mein nahi. Install
  ke liye **HTTPS** zaroori hai (localhost par bina HTTPS ke chalta hai).
- Icons `client/public/pwa-*.png`. Logo badlo to: `cd server && node scripts/makeIcons.mjs`.
- App ka naam: `client/src/utils/appInfo.js`, `client/index.html` aur manifest (`vite.config.js`).

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

Production mein ek hi Node server API aur React build dono serve karta hai. Do tareeke hain:
**Render** (sabse aasaan, neeche) ya **apna server** (Nginx + PM2, uske baad ke steps).

### Render par deploy

Repo mein `render.yaml` (Blueprint) hai, isliye Render par build / start command haath se nahi likhne.
URL, port aur proxy ki settings code khud Render se le leta hai (`server/config/env.js`).

1. **MongoDB Atlas** par free cluster banao, ek database user banao, aur Network Access mein
   `0.0.0.0/0` allow karo (Render ka IP badalta rehta hai). Connection string copy karo
   (`mongodb+srv://USER:PASSWORD@cluster.../payroll`).
2. Code GitHub ke `main` par push karo.
3. render.com > **New > Blueprint** > ye repo chuno. Render teen values maangega:
   `MONGO_URI` (step 1 wala), `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`.
   `JWT_SECRET` aur `QR_SECRET` Render khud bana deta hai.
4. Deploy poora hone par `https://<service-naam>.onrender.com` kholo aur Super Admin se login karo
   (pehli baar start hote hi Super Admin apne aap ban jata hai). API ka haal: `/api`.

Dhyan rahe:

- **Free plan so jata hai**: 15 minute koi request na aaye to service band ho jati hai aur agli
  request par ~1 minute mein jaagti hai. Soyi hui service mein cron jobs (raat ka auto punch-out,
  mahine ka leave credit) **nahi chalte**. Asli use ke liye paid plan lo.
- **Upload hui files** (visit photo, attachments) free plan par har deploy / restart mein mit jati
  hain. Paid plan par `render.yaml` ke neeche wali `disk` lines kholo.
- Email (verification / password reset) chahiye to dashboard mein `SMTP_*` variables jodo.
- Apna domain jodo to `CLIENT_URL=https://apna-domain.com` set karo (comma se kai de sakte ho).
- Har `git push` (main) par Render apne aap naya version deploy karta hai.

### Apna server (Nginx + PM2)

Node server ke aage Nginx HTTPS sambhalta hai.

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
# Email: verification code aur password reset (public registration ke liye zaroori)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM=PayRoster <no-reply@payroll.example.com>
# Sales meetings use karte ho to (dono optional):
# QR_SECRET=<48+ random bytes>         # meeting QR ka secret; na ho to JWT_SECRET se nikalta hai
# UPLOAD_DIR=/var/lib/payroster/uploads   # visit photo / attachments; na ho to server/uploads
```

`NODE_ENV=production` hone par `FORCE_HTTPS` aur `SERVE_CLIENT` apne aap ON ho jate hain.

### 3. Pehla Super Admin aur server start

```bash
npm run seed:superadmin
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup       # reboot ke baad apne aap chale
```

Ek hi instance chalao: cron jobs (raat 11:59 auto punch-out, 1 tarikh ko leave credit, har 10 minute
chhooti hui sales meetings) server ke andar chalte hain.

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
  Payroll aur attendance ka data dobara nahi ban sakta. Sales meetings ki visit photos aur attachments
  database mein nahi, disk par hain (`server/uploads` ya `UPLOAD_DIR`): us folder ka backup alag se lo,
  aur naya version deploy karte waqt use mat mitao.
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

## Free registration, plans aur account

Landing page (`/`) ke "Start Free" se koi bhi `/register` par company ka naam, apna naam, email aur password
dekar account bana sakta hai. Isse ek nayi company (plan `FREE`) aur uska admin banta hai. Super Admin ki banayi
companies pehle ki tarah banti hain.

**Email (SMTP).** Verification code aur password reset email se jate hain. `server/.env` mein `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` bharo.

- SMTP diya ho: naya account banate hi email par 6 ank ka code jata hai. Verify hone tak us account ko company ka
  koi data nahi milta (code 15 minute chalta hai, 5 galat koshish ke baad naya maangna padta hai).
- SMTP na diya ho: email verify nahi karwayi jati (account seedha chalu), aur development mein code / reset link
  server ke console par chhapta hai. **Public launch se pehle SMTP zaroor lagao.**
- "Forgot your password?" (login page): email par link jata hai (30 minute, ek hi baar). Naya password lagte hi
  us user ke purane sabhi login band ho jate hain. Email register ho ya na ho, jawab ek hi aata hai.
- Bachav: ek IP se ghante mein `REGISTER_RATE_LIMIT_MAX` (default 5) accounts / reset requests.
  Registration band karna ho to `ALLOW_REGISTRATION=false`.

**Plans** (`server/utils/constants.js`: `PLAN_STAFF_LIMIT`, `PLAN_FEATURES`):

| Plan | Active staff | Features |
|---|---|---|
| Free | 10 | Staff, geofence attendance, attendance calendar, dashboard |
| Starter | 50 | + Leave (CL / EL), punch corrections, payroll aur salary slips |
| Professional | 250 | + PF / ESI, working hours, sales meetings, Excel export |
| Enterprise | koi hadd nahi | Professional jaisa |

- Plan ke bahar ka feature server par band hai (403, kaun sa plan chahiye ye bata kar), menu mein nahi dikhta, aur
  Settings mein uska toggle band rehta hai. Staff ki hadd par naya staff jodna / band staff chalu karna mana hai.
- Purani aur Super Admin ki banayi companies `ENTERPRISE` par hain, yaani un par koi rok nahi.
- **Upgrade:** admin "Plan & Billing" se request bhejta hai -> Super Admin ko ghanti aur Companies ke
  "Upgrade requests" tab mein dikhti hai -> company ke page par Approve / Reject. Approve karte hi plan badal jata hai.
  Online payment (gateway) abhi nahi hai; payment bahar se lo, phir approve karo.
- Plan ghatane par jo settings naye plan mein nahi aati (leave, PF / ESI, working hours, sales) wo band ho jati hain;
  data bana rehta hai.

## Sales meetings (QR + geofence se client visit)

Admin client meeting banakar sales manager ko assign karta hai; sales manager client ke yahan pahunch
kar QR scan karta hai aur apni location ke saath check-in / check-out karta hai. Maqsad: kaun mila,
kahan, kab aaya, kab gaya, kitni der ruka, location sahi thi ya nahi, nateeja kya raha, agla kadam kya.

**Chalu karna** (default OFF): admin Settings -> "Sales Meetings" ON -> Staff form mein jise chahiye
use "Sales manager" tick karo -> Sales -> Clients mein client jodo -> Meetings -> Create Meeting.

**Flow**

1. Admin meeting banata hai (client, sales manager, date / time, map par location, geofence radius;
   default 100 m). QR saath hi ban jata hai.
2. Admin meeting ke page se QR **Share** (phone ka share sheet, jaise WhatsApp) ya **Download** karta
   hai. Kisi aur tareeke se bheja ho to "Mark as Sent".
3. Sales manager: Sales -> Scan Meeting QR -> **Check In**. Server dekhta hai: QR sahi hai, meeting
   isi bande ki hai, aaj ki hai, time window ke andar hai, GPS theek hai, aur banda geofence ke andar hai.
4. Meeting ke baad **Check Out**: outcome (zaroori), requirement, deal value, follow-up, remarks.
   Company ne "Visit photo required" ON kiya ho to photo ke bina check-out nahi hota.
5. Admin ko meeting ke page par visit, location, result, photo / attachments aur poori audit history
   dikhti hai; Meetings list se **Export Excel** (jo filters lage hain wahi Excel mein).

**Status:** `SCHEDULED` -> `QR_SENT` -> `CHECKED_IN` -> `COMPLETED`. Check-in ka waqt nikal jaye to
`MISSED` (cron, har 10 minute). Admin check-in se pehle `CANCELLED` kar sakta hai.

**Jaanne layak baatein**

- QR ke andar sirf ek random jaisa code hai (koi naam / ID / location nahi); database mein uska sirf
  hash rehta hai. "Regenerate QR" ya sales manager badalne par purana QR turant bekaar ho jata hai.
- QR sahi hona kaafi nahi: check-in ke liye geofence ke andar hona zaroori hai. Time aur doori hamesha
  server nikalta hai; phone se aaya time / distance / status ignore hota hai.
- Check-in ka time window: meeting ke start se N minute pehle se, end ke N minute baad tak
  (Settings -> "Check-in window", default 30).
- Check-out geofence ke bahar se (ya bina GPS ke) bhi ho jata hai, lekin wo darj hota hai
  ("Outside area" / "No location"), taaki GPS ki dikkat mein visit khuli na reh jaye.
- Ek sales manager ki ek waqt mein ek hi visit khuli ho sakti hai, aur uski do meetings ka time
  overlap nahi ho sakta.
- Camera (QR scan, visit photo) aur GPS **sirf HTTPS** (ya localhost) par chalte hain. Camera na chale
  to QR ki photo / screenshot upload karne ka raasta hai.
- Follow-ups: check-out mein follow-up date bharne par "Follow-ups" list aur ghanti mein aate hain.
  Push / SMS / email reminder nahi hai.
- **Location verification 100% fraud-proof nahi hai.** Browser nakli GPS nahi pakad sakta, aur visit
  photo ke "app ke camera se li" hone ki jaankari phone deta hai. Har check-in / check-out ke saath
  GPS accuracy, IP aur device save hota hai, aur mana hua har check-in audit history mein darj hota
  hai; shak hone par wahi dekho.

## Phases

- [x] 1. Setup + Auth + Roles
- [x] 2. Super Admin module (Company CRUD, admin creation)
- [x] 3. Staff management
- [x] 4. Attendance (geofence punch)
- [x] 5. Leave (CL/EL)
- [x] 6. Payroll (30-day, PF/ESI, slip PDF, Excel)
- [x] 7. Testing + Deployment
- [x] 8. Punch correction requests, half-day leave, attendance calendar
- [x] 9. Sales meetings (clients, QR, geofence check-in / check-out, photo, follow-ups, dashboard, Excel)
