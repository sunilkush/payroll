import { useState } from 'react';
import { ArrowRightOutlined, LockOutlined, LoginOutlined, MailOutlined } from '@ant-design/icons';
import { Divider } from 'antd';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Alert from '../../components/Alert/Alert.jsx';
import Button from '../../components/Button/Button.jsx';
import FormField from '../../components/FormField/FormField.jsx';
import Loader from '../../components/Loader/Loader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { APP_NAME } from '../../utils/appInfo.js';
import { ROLE_HOME } from '../../utils/roles.js';
import AuthBrand, { AuthFoot, AuthTop } from './AuthBrand.jsx';
import './Login.css';

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
      <AuthBrand />

      <main className="login__main">
        <AuthTop prompt={`New to ${APP_NAME}?`} to="/register" label="Create account" />
        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <span className="login__form-icon" aria-hidden="true">
            <LoginOutlined />
          </span>
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

          <p className="login__help">
            <Link to="/forgot-password">Forgot your password?</Link>
          </p>

          <Divider plain className="login__divider">
            New here?
          </Divider>
          <Link to="/register" className="login__alt">
            Create a free account
          </Link>
        </form>
        <AuthFoot />
      </main>
    </div>
  );
}
