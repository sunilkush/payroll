import attendance from './screens/landing-attendance.png';
import dashboard from './screens/landing-dashboard.png';
import leave from './screens/landing-leave.png';
import payroll from './screens/landing-payroll.png';
import sales from './screens/landing-sales.png';

// App ke ASLI screens (admin ke pages ke screenshot, demo data ke saath), browser ki khidki jaise frame mein.
// Naye screenshot lene hon: app ko demo data (npm run seed:demo) ke saath chalao, admin login se 1366px par
// page ka screenshot lo aur screens/ mein isi naam se rakh do. Naam "landing-" se shuru rahe: vite.config.js
// inhe PWA ke offline cache se bahar rakhta hai (ye sirf landing page ke kaam ke hain).
const SCREENS = {
  dashboard: { src: dashboard, label: 'Dashboard' },
  attendance: { src: attendance, label: 'Attendance' },
  leave: { src: leave, label: 'Leaves' },
  payroll: { src: payroll, label: 'Payroll' },
  sales: { src: sales, label: 'Meetings' },
};

// Saare screenshot isi size ke hain; width / height dene se image aane se pehle hi jagah ban jati hai (page uchhalta nahi).
const SIZE = { width: 2049, height: 1230 };

// variant: SHOWCASE_TABS ka key. eager: page khulte hi dikhne wali image (hero) turant aaye; baaki zaroorat par.
export default function MockScreen({ variant = 'dashboard', eager = false }) {
  const screen = SCREENS[variant] ?? SCREENS.dashboard;

  return (
    <figure className="mock">
      <div className="mock__bar" aria-hidden="true">
        <span className="mock__dot" />
        <span className="mock__dot" />
        <span className="mock__dot" />
        <span className="mock__url">PayRoster · {screen.label}</span>
      </div>
      <img
        className="mock__image"
        src={screen.src}
        alt={`PayRoster ${screen.label} screen with sample data`}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        {...SIZE}
      />
    </figure>
  );
}
