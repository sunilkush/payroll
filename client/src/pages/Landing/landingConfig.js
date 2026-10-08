import {
  BankOutlined,
  BarChartOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CloudOutlined,
  EnvironmentOutlined,
  FieldTimeOutlined,
  FileProtectOutlined,
  MobileOutlined,
  QrcodeOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';

// Landing page ka saara content aur links yahin hain; sections sirf ise dikhate hain.

// CTA kahan le jaate hain. "Start Free" / "Get Started" free account banane ke page par jaate hain.
// Sales / support ka email. Bharte hi "Contact Sales" aur "Book a Demo" email kholenge aur footer mein dikhega;
// khali ho to wo page ke neeche (footer) tak le jaate hain.
export const CONTACT_EMAIL = '';

export const LINKS = {
  login: '/login',
  signup: '/register',
  demo: '#product',
  contact: CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}` : '#contact',
};

export const NAV = [
  { href: '#features', label: 'Features' },
  { href: '#product', label: 'Product' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#why', label: 'Why Us' },
  { href: '#faq', label: 'FAQ' },
];

export const TRUST = [
  { icon: SafetyCertificateOutlined, label: 'Secure Data' },
  { icon: CloudOutlined, label: 'Cloud Based' },
  { icon: BankOutlined, label: 'Multi-Company Ready' },
  { icon: BarChartOutlined, label: 'Automated Reports' },
  { icon: MobileOutlined, label: 'Works on Any Phone' },
];

export const FEATURES = [
  { icon: TeamOutlined, title: 'Staff Management', text: 'Staff profiles, salary structure, bank, PF and ESI details in one place.' },
  { icon: EnvironmentOutlined, title: 'Geofenced Attendance', text: 'Staff punch in and out from their phone, only inside your office range.' },
  { icon: FieldTimeOutlined, title: 'Punch Corrections', text: 'Forgot to punch? Staff request a fix and the admin approves or rejects it.' },
  { icon: CalendarOutlined, title: 'Leave Management', text: 'CL and EL with monthly credit, half days, balances and one-tap approvals.' },
  { icon: WalletOutlined, title: 'Payroll', text: 'Monthly payroll on a 30-day basis with loss of pay worked out from attendance.' },
  { icon: FileProtectOutlined, title: 'PF & ESI', text: 'Statutory deductions and employer contributions calculated for every slip.' },
  { icon: ClockCircleOutlined, title: 'Working Hours', text: 'Set office timings and see late arrivals, early exits and hours worked.' },
  { icon: QrcodeOutlined, title: 'Sales Visit Tracking', text: 'Assign client meetings and verify each visit with a QR scan and location.' },
  { icon: BarChartOutlined, title: 'Reports & Exports', text: 'Dashboards, salary slips in PDF and payroll and visit reports in Excel.' },
  { icon: BankOutlined, title: 'Multi-Company', text: 'Run several companies from one platform, each with its own data and admins.' },
];

// Product showcase ke tabs. Har tab ka screen MockScreen.jsx mein isi key se banta hai.
export const SHOWCASE_TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'leave', label: 'Leave' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'sales', label: 'Sales Visits' },
  { key: 'reports', label: 'Reports' },
];

export const BENEFITS = [
  'Simple enough to use without training',
  'Attendance flows straight into payroll',
  'No registers, spreadsheets or manual totals',
  'One place for staff, leave, salary and visits',
  'Live view of who is in, on leave or in the field',
  'Each company sees only its own data',
  'Grows from five staff to several companies',
];

// ---------- Pricing ----------
// Pricing sirf yahin hai. Baad mein backend ke subscription plans se jodna ho to yahi shape rakho:
//   monthlyPrice / yearlyPrice  rupaye; null = "Custom" (sales se baat)
//   yearlyPrice                 poore saal ka kul (12 mahine), 20% chhoot ke saath
export const YEARLY_DISCOUNT_PERCENT = 20;
const yearly = (monthly) => Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT_PERCENT / 100));

export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    subtitle: 'For small teams getting started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: ['Up to 10 staff', 'Staff management', 'Geofenced attendance', 'Attendance calendar', 'Basic dashboard', 'Email support'],
    cta: { label: 'Start Free', href: LINKS.signup },
  },
  {
    id: 'starter',
    name: 'Starter',
    subtitle: 'For small offices and shops',
    monthlyPrice: 999,
    yearlyPrice: yearly(999),
    features: ['Up to 50 staff', 'Everything in Free', 'Leave management (CL / EL)', 'Punch corrections', 'Payroll with salary slips', 'Attendance reports', 'Email support'],
    cta: { label: 'Start Starter', href: LINKS.signup },
  },
  {
    id: 'professional',
    name: 'Professional',
    subtitle: 'For growing companies',
    monthlyPrice: 2499,
    yearlyPrice: yearly(2499),
    popular: true,
    features: ['Up to 250 staff', 'Everything in Starter', 'PF & ESI calculation', 'Working hours and late tracking', 'Sales meetings with QR check-in', 'Visit photos and follow-ups', 'Excel exports', 'Priority support'],
    cta: { label: 'Start Professional', href: LINKS.signup },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'For large teams and multiple companies',
    monthlyPrice: null,
    yearlyPrice: null,
    features: ['Unlimited staff', 'Everything in Professional', 'Multi-company management', 'Multiple admins', 'Dedicated support', 'Custom reports', 'Custom branding', 'Onboarding help'],
    cta: { label: 'Contact Sales', href: LINKS.contact },
  },
];

export const STEPS = [
  { title: 'Create Your Company', text: 'Your company and its admin account are set up in minutes.' },
  { title: 'Set Up Your Office', text: 'Pin the office on the map, add staff and choose your leave and payroll rules.' },
  { title: 'Start Managing Everything', text: 'Staff punch from their phones; attendance, leave and salary stay in sync.' },
];

// App ki sachchi baatein (banawati customer numbers nahi).
export const STATS = [
  { value: 100, suffix: '%', label: 'Punches location-checked' },
  { value: 30, suffix: '-day', label: 'Salary basis, every month' },
  { value: 3, suffix: '', label: 'Roles: super admin, admin, staff' },
  { value: 1, suffix: '', label: 'App for phone and desktop' },
];

// Namoone ke quotes: asli customers ke aane par badal do. Page par bhi "sample" likha hai.
export const TESTIMONIALS = [
  {
    name: 'Operations Manager',
    role: 'Manufacturing unit, 60 staff',
    quote: 'Attendance, leave and salary used to live in three registers. Now the month-end payroll takes minutes, not days.',
  },
  {
    name: 'HR Executive',
    role: 'Trading company, 25 staff',
    quote: 'Staff punch from their own phones at the office gate. I no longer chase anyone for attendance sheets.',
  },
  {
    name: 'Sales Head',
    role: 'Distribution business, 12 field staff',
    quote: 'The QR check-in tells me who met which client, when they arrived and what was discussed, without a single phone call.',
  },
];

export const FAQS = [
  { q: 'What is PayRoster?', a: 'PayRoster is an attendance, leave and payroll system for companies. Staff punch in from their phones, leave is approved online, and monthly salary with PF and ESI is calculated from the same data.' },
  { q: 'Can I manage multiple companies?', a: 'Yes. Each company has its own admins, staff, settings and data, and one company can never see another company’s records.' },
  { q: 'How does attendance work?', a: 'You pin your office on a map and set a range. Staff can punch in and out only when their phone is inside that range, and each punch stores time, location and distance.' },
  { q: 'Does it support payroll?', a: 'Yes. Payroll runs on a 30-day basis, takes loss of pay from attendance, and produces salary slips in PDF and a full payroll sheet in Excel.' },
  { q: 'Can I manage PF and ESI?', a: 'Yes. PF and ESI can be switched on per company and per staff member. Employee deductions and employer contributions are calculated for you.' },
  { q: 'Is the platform cloud-based?', a: 'Yes. It runs in the browser on any phone or computer, and can be installed on a phone like an app. There is nothing to install on office computers.' },
  { q: 'Can staff see their own records?', a: 'Yes. Every staff member sees their own attendance calendar, leave balance, requests and finalized salary slips, and nothing of anyone else.' },
  { q: 'Can I track field sales visits?', a: 'Yes. An admin creates a client meeting and shares a QR code. The sales manager scans it at the client’s location, and the visit is recorded with time, location and outcome.' },
  { q: 'Can I upgrade my plan later?', a: 'Yes. You can start small and move to a bigger plan when your team grows. Your data stays as it is.' },
  { q: 'Is my data secure?', a: 'Access is by login and role, company data is kept separate, and the app is served over HTTPS. As with any GPS-based system, location checks reduce misuse but cannot rule it out completely.' },
];

export const FOOTER = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Product tour', href: '#product' },
      { label: 'How it works', href: '#how' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'Attendance', href: '#features' },
      { label: 'Leave', href: '#features' },
      { label: 'Payroll', href: '#features' },
      { label: 'Sales visits', href: '#features' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Why PayRoster', href: '#why' },
      { label: 'Customers', href: '#testimonials' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Common questions', href: '#faq' },
      { label: 'Log in', href: LINKS.login },
    ],
  },
];
