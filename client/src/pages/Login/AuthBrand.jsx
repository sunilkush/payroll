import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  EnvironmentOutlined,
  LockOutlined,
  MobileOutlined,
  SafetyCertificateOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { APP_NAME } from '../../utils/appInfo.js';
import './Login.css';

const FEATURES = ['Geofence punch in / out', 'CL / EL leave approval', 'Payroll with PF / ESI', 'Sales visits with QR check-in'];

// Brand panel ke cards sirf sajawat hain (app kaisa dikhta hai uski jhalak), asli data nahi.
const WEEK = [
  { day: 'M', height: 34 },
  { day: 'T', height: 48 },
  { day: 'W', height: 28 },
  { day: 'T', height: 42 },
  { day: 'F', height: 48 },
  { day: 'S', height: 20 },
];

// Login, Register aur account ke baaki pages ka gehra brand panel:
// logo, headline, app ki jhalak (teen tairte cards) aur features.
export default function AuthBrand() {
  return (
    <aside className="login__brand">
      {/* Peeche ki halki roshni aur bindiyon ka pattern (sirf sajawat) */}
      <span className="login__glow login__glow--one" aria-hidden="true" />
      <span className="login__glow login__glow--two" aria-hidden="true" />
      <span className="login__grid" aria-hidden="true" />

      <Link to="/" className="login__logo" aria-label={`${APP_NAME} home`}>
        <span className="login__logo-mark" aria-hidden="true">
          P
        </span>
        <span className="login__logo-text">{APP_NAME}</span>
      </Link>

      <div className="login__hero">
        <span className="login__pill">
          <SafetyCertificateOutlined /> Each company’s data kept separate and secure
        </span>
        <h2 className="login__headline">
          From attendance to salary slip, <span className="login__headline-accent">all in one place.</span>
        </h2>
        <p className="login__lead">Manage punches, leave and payroll together, even from your phone.</p>
      </div>

      <div className="login__stage" aria-hidden="true">
        <div className="login__card login__card--main">
          <div className="login__card-head">
            <span>Attendance today</span>
            <span className="login__chip">Present</span>
          </div>
          <p className="login__card-time">09:30 AM</p>
          <p className="login__card-meta">
            <EnvironmentOutlined /> Head Office · 18 m
          </p>
          <div className="login__week">
            {WEEK.map((item, index) => (
              <span key={index} className="login__week-day">
                <span className="login__week-bar" style={{ height: item.height }} />
                {item.day}
              </span>
            ))}
          </div>
        </div>

        <div className="login__card login__card--pay">
          <span className="login__card-icon">
            <WalletOutlined />
          </span>
          <span>
            <span className="login__card-meta">Net salary · Oct</span>
            <strong>₹18,386</strong>
          </span>
        </div>

        <div className="login__card login__card--visit">
          <span className="login__card-icon login__card-icon--ok">
            <CheckCircleFilled />
          </span>
          <span>
            <span className="login__card-meta">Client visit</span>
            <strong>Verified · 33 m</strong>
          </span>
        </div>
      </div>

      <ul className="login__features">
        {FEATURES.map((label) => (
          <li key={label} className="login__feature">
            <CheckCircleFilled className="login__feature-check" /> {label}
          </li>
        ))}
      </ul>
    </aside>
  );
}

// Form ke upar ki patti: baayein "Home", daayein doosre page ka raasta (Login <-> Register).
export function AuthTop({ prompt, to, label }) {
  return (
    <div className="login__top">
      <Link to="/" className="login__back">
        <ArrowLeftOutlined /> Home
      </Link>
      <span className="login__switch">
        <span className="login__switch-prompt">{prompt}</span>
        <Link to={to} className="login__switch-link">
          {label}
        </Link>
      </span>
    </div>
  );
}

const TRUST = [
  { icon: <LockOutlined />, label: 'Secure login' },
  { icon: <SafetyCertificateOutlined />, label: 'Company data kept separate' },
  { icon: <MobileOutlined />, label: 'Works on any phone' },
];

// Form ke neeche bharose ki chhoti line aur copyright
export function AuthFoot() {
  return (
    <div className="login__foot">
      <ul className="login__trust">
        {TRUST.map((item) => (
          <li key={item.label}>
            {item.icon} {item.label}
          </li>
        ))}
      </ul>
      <p className="login__footer">
        &copy; {new Date().getFullYear()} {APP_NAME}
      </p>
    </div>
  );
}
