import { useState } from 'react';
import {
  ArrowRightOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Alert from '../../components/Alert/Alert.jsx';
import Button from '../../components/Button/Button.jsx';
import FormField from '../../components/FormField/FormField.jsx';
import Loader from '../../components/Loader/Loader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_HOME } from '../../utils/roles.js';
import './Login.css';

const FEATURES = [
  { icon: <EnvironmentOutlined />, label: 'Geofence punch in / out' },
  { icon: <CalendarOutlined />, label: 'CL / EL leave approval' },
  { icon: <WalletOutlined />, label: 'Payroll with PF / ESI' },
  { icon: <FileTextOutlined />, label: 'Salary slip PDF' },
];

// Brand panel ka "preview" card sirf sajawat hai (app kaisa dikhta hai uski jhalak), asli data nahi.
const PREVIEW_STATS = [
  { label: 'Present', value: '22' },
  { label: 'Leave', value: '1' },
  { label: 'Net Salary', value: '₹18,386' },
];

// Layout (mobile-first):
//   Phone     gehra brand header (logo + headline) aur uske upar chadha hua form card
//   Tablet    wahi, form beech mein card ki tarah
//   Desktop   baayein brand panel (headline, preview card, features), daayein form
export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Loader />;
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedIn = await login(form);
      // Jis page se login par aaye the wahin wapas, warna role ka home.
      const from = location.state?.from?.pathname;
      const home = ROLE_HOME[loggedIn.role];
      navigate(from?.startsWith(home) ? from : home, { replace: true });
    } catch (err) {
      setError(err.errors?.[0]?.message || err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="login">
      <aside className="login__brand">
        {/* Peeche ki halki roshni (sirf sajawat) */}
        <span className="login__glow login__glow--one" aria-hidden="true" />
        <span className="login__glow login__glow--two" aria-hidden="true" />

        <div className="login__logo">
          <span className="login__logo-mark" aria-hidden="true">
            P
          </span>
          <span className="login__logo-text">Payroll</span>
        </div>

        <div className="login__hero">
          <span className="login__pill">
            <SafetyCertificateOutlined /> Each company’s data kept separate and secure
          </span>
          <h2 className="login__headline">
            From attendance to salary slip, <span className="login__headline-accent">all in one place.</span>
          </h2>
          <p className="login__lead">Manage punches, leave and payroll together, even from your phone.</p>
        </div>

        <div className="login__preview" aria-hidden="true">
          <div className="login__preview-head">
            <span>Attendance today</span>
            <span className="login__preview-chip">Present</span>
          </div>
          <p className="login__preview-time">09:30 AM</p>
          <p className="login__preview-place">
            <EnvironmentOutlined /> Head Office · 18m
          </p>
          <dl className="login__preview-stats">
            {PREVIEW_STATS.map((stat) => (
              <div key={stat.label} className="login__preview-stat">
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <ul className="login__features">
          {FEATURES.map((feature) => (
            <li key={feature.label} className="login__feature">
              <span className="login__feature-icon">{feature.icon}</span>
              {feature.label}
            </li>
          ))}
        </ul>
      </aside>

      <main className="login__main">
        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <h1 className="login__title">Welcome back</h1>
          <p className="login__subtitle">Sign in to your account</p>

          <Alert>{error}</Alert>

          <FormField
            label="Email"
            name="email"
            type="email"
            className="login__input"
            autoComplete="username"
            placeholder="you@company.com"
            prefix={<MailOutlined className="login__input-icon" />}
            value={form.email}
            onChange={handleChange}
          />
          <FormField
            label="Password"
            name="password"
            type="password"
            className="login__input"
            autoComplete="current-password"
            placeholder="Password"
            prefix={<LockOutlined className="login__input-icon" />}
            value={form.password}
            onChange={handleChange}
          />

          <Button
            type="submit"
            block
            loading={submitting}
            className="login__submit"
            icon={<ArrowRightOutlined />}
            iconPlacement="end"
          >
            Login
          </Button>

          <p className="login__help">Forgot your password? Ask your admin to reset it.</p>
        </form>
        <p className="login__footer">&copy; {new Date().getFullYear()} Payroll</p>
      </main>
    </div>
  );
}
