import { useState } from 'react';
import { MailOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import { Navigate, useNavigate } from 'react-router-dom';
import { resendVerificationApi, verifyEmailApi } from '../../api/authApi.js';
import Alert from '../../components/Alert/Alert.jsx';
import Button from '../../components/Button/Button.jsx';
import Loader from '../../components/Loader/Loader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLogout } from '../../context/useLogout.js';
import { ROLE_HOME } from '../../utils/roles.js';
import AuthBrand, { AuthFoot } from '../Login/AuthBrand.jsx';
import '../Login/Login.css';
import './Account.css';

// Naya account banane ke baad: email par aaya 6 ank ka code. Verify hone tak app ka koi page nahi khulta
// (ProtectedRoute yahin bhej deta hai, aur server bhi company ka data nahi deta).
export default function VerifyEmail() {
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const logout = useLogout();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');

  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.emailVerified) return <Navigate to={ROLE_HOME[user.role]} replace />;

  const submit = async (value) => {
    setError('');
    setNotice('');
    setBusy('verify');
    try {
      await verifyEmailApi(value);
      await refresh();
      navigate(ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      setError(err.errors?.[0]?.message || err.message);
      setCode('');
      setBusy('');
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    setBusy('resend');
    try {
      const res = await resendVerificationApi();
      setNotice(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="login">
      <AuthBrand />
      <main className="login__main">
        <form
          className="login__form account"
          onSubmit={(event) => {
            event.preventDefault();
            if (code.length === 6) submit(code);
          }}
          noValidate
        >
          <span className="login__form-icon" aria-hidden="true">
            <MailOutlined />
          </span>
          <h1 className="login__title">Verify your email</h1>
          <p className="login__subtitle">
            We sent a 6-digit code to <strong>{user.email}</strong>. Enter it below to start using your account.
          </p>

          <Alert>{error}</Alert>
          <Alert type="success">{notice}</Alert>

          {/* Chhe ank poore hote hi apne aap submit */}
          <Input.OTP
            length={6}
            size="large"
            autoFocus
            inputMode="numeric"
            className="account__otp"
            aria-label="Verification code"
            value={code}
            onChange={(value) => {
              setCode(value);
              if (value.length === 6) submit(value);
            }}
            disabled={busy === 'verify'}
          />

          <Button type="submit" block loading={busy === 'verify'} disabled={code.length !== 6} className="login__submit">
            Verify Email
          </Button>

          <p className="login__help">
            Did not get it? Check spam, or{' '}
            <Button variant="secondary" size="sm" loading={busy === 'resend'} onClick={handleResend}>
              Send a new code
            </Button>
          </p>
          <p className="login__help">
            Wrong email?{' '}
            <Button variant="secondary" size="sm" onClick={logout}>
              Log out
            </Button>
          </p>
        </form>
        <AuthFoot />
      </main>
    </div>
  );
}
