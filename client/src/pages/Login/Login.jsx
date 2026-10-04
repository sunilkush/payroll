import { useState } from 'react';
import { Card } from 'antd';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Alert from '../../components/Alert/Alert.jsx';
import Button from '../../components/Button/Button.jsx';
import FormField from '../../components/FormField/FormField.jsx';
import Loader from '../../components/Loader/Loader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_HOME } from '../../utils/roles.js';
import './Login.css';

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
      <Card className="login__card">
        <form onSubmit={handleSubmit} noValidate>
          <h1 className="login__title">Payroll</h1>
          <p className="login__subtitle">Apne account mein login karein</p>

          <Alert>{error}</Alert>

          <FormField
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            value={form.email}
            onChange={handleChange}
          />
          <FormField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
          />

          <Button type="submit" block loading={submitting}>
            Login
          </Button>
        </form>
      </Card>
    </div>
  );
}
