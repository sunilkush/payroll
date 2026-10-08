import { useState } from 'react';
import { ArrowRightOutlined, KeyOutlined, MailOutlined } from '@ant-design/icons';
import { forgotPasswordApi } from '../../api/authApi.js';
import Alert from '../../components/Alert/Alert.jsx';
import Button from '../../components/Button/Button.jsx';
import FormField from '../../components/FormField/FormField.jsx';
import AuthBrand, { AuthFoot, AuthTop } from '../Login/AuthBrand.jsx';
import '../Login/Login.css';
import './Account.css';

// Password bhool gaye: email par reset link jata hai. Email register ho ya na ho, message ek hi dikhta hai
// (koi ye na jaan sake ki kaun sa email system mein hai).
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await forgotPasswordApi(email);
      setSent(res.message);
    } catch (err) {
      setError(err.errors?.[0]?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <AuthBrand />
      <main className="login__main">
        <AuthTop prompt="Remembered it?" to="/login" label="Log in" />
        <form className="login__form account" onSubmit={handleSubmit} noValidate>
          <span className="login__form-icon" aria-hidden="true">
            <KeyOutlined />
          </span>
          <h1 className="login__title">Forgot your password?</h1>
          <p className="login__subtitle">Enter your account email and we will send you a link to set a new password.</p>

          <Alert>{error}</Alert>

          {sent ? (
            <>
              <Alert type="success">{sent}</Alert>
              <p className="login__help">The link is valid for 30 minutes. Check your spam folder if you do not see it.</p>
            </>
          ) : (
            <>
              <FormField
                label="Email"
                name="email"
                type="email"
                className="login__input"
                autoComplete="username"
                placeholder="you@company.com"
                prefix={<MailOutlined className="login__input-icon" />}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoFocus
              />
              <Button type="submit" block loading={busy} className="login__submit" icon={<ArrowRightOutlined />} iconPlacement="end">
                Send Reset Link
              </Button>
            </>
          )}
        </form>
        <AuthFoot />
      </main>
    </div>
  );
}
