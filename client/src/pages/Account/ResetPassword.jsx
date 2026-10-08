import { useState } from 'react';
import { ArrowRightOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPasswordApi } from '../../api/authApi.js';
import Alert from '../../components/Alert/Alert.jsx';
import Button from '../../components/Button/Button.jsx';
import FormField from '../../components/FormField/FormField.jsx';
import { useFeedback } from '../../utils/useFeedback.js';
import AuthBrand, { AuthFoot, AuthTop } from '../Login/AuthBrand.jsx';
import '../Login/Login.css';
import './Account.css';

// Email ke link se yahan aate hain (?token=...). Naya password lagte hi login page par.
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const { toast } = useFeedback();

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const handleChange = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    if (form.password !== form.confirm) {
      setFieldErrors({ confirm: 'The two passwords do not match.' });
      return;
    }
    setBusy(true);
    try {
      const res = await resetPasswordApi(token, form.password);
      toast.success(res.message);
      navigate('/login', { replace: true });
    } catch (err) {
      const first = err.errors?.[0];
      if (first?.field === 'password') setFieldErrors({ password: first.message });
      else setError(err.message);
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
            <SafetyOutlined />
          </span>
          <h1 className="login__title">Set a new password</h1>
          <p className="login__subtitle">Choose a password with at least 8 characters.</p>

          <Alert>{error}</Alert>

          {token ? (
            <>
              <FormField
                label="New password"
                name="password"
                type="password"
                className="login__input"
                autoComplete="new-password"
                prefix={<LockOutlined className="login__input-icon" />}
                value={form.password}
                onChange={handleChange}
                error={fieldErrors.password}
                autoFocus
              />
              <FormField
                label="Confirm new password"
                name="confirm"
                type="password"
                className="login__input"
                autoComplete="new-password"
                prefix={<LockOutlined className="login__input-icon" />}
                value={form.confirm}
                onChange={handleChange}
                error={fieldErrors.confirm}
              />
              <Button type="submit" block loading={busy} className="login__submit" icon={<ArrowRightOutlined />} iconPlacement="end">
                Change Password
              </Button>
            </>
          ) : (
            <Alert>This reset link is not complete. Open the link from your email again.</Alert>
          )}

          <p className="login__help">
            Link expired? <Link to="/forgot-password">Ask for a new one</Link>
          </p>
        </form>
        <AuthFoot />
      </main>
    </div>
  );
}
