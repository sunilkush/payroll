import { useState } from 'react';
import {
  ArrowRightOutlined,
  BankOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  RocketOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Divider } from 'antd';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Alert from '../../components/Alert/Alert.jsx';
import Button from '../../components/Button/Button.jsx';
import FormField from '../../components/FormField/FormField.jsx';
import Loader from '../../components/Loader/Loader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { toFieldErrors } from '../../utils/formErrors.js';
import { ROLE_HOME } from '../../utils/roles.js';
import AuthBrand, { AuthFoot, AuthTop } from '../Login/AuthBrand.jsx';
import '../Login/Login.css';
import './Register.css';

const EMPTY_FORM = { companyName: '', name: '', email: '', phone: '', password: '' };

// Free account: company + uska pehla admin. Ban jate hi user login ho kar admin dashboard par pahunchta hai,
// jahan pehla kaam (office location, staff) dikhaya jata hai. Layout wahi hai jo Login ka.
export default function Register() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Loader />;
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setSubmitting(true);
    try {
      const created = await register(form);
      navigate(ROLE_HOME[created.role], { replace: true });
    } catch (err) {
      const errors = toFieldErrors(err);
      setFieldErrors(errors);
      // Field ke neeche dikh raha ho to upar wahi baat dobara nahi
      setError(Object.keys(errors).length ? '' : err.message);
      setSubmitting(false);
    }
  };

  const field = (name, label, extra = {}) => (
    <FormField
      label={label}
      name={name}
      className="login__input"
      value={form[name]}
      onChange={handleChange}
      error={fieldErrors[name]}
      {...extra}
    />
  );

  return (
    <div className="login register">
      <AuthBrand />

      <main className="login__main">
        <AuthTop prompt="Already have an account?" to="/login" label="Log in" />
        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <span className="login__form-icon" aria-hidden="true">
            <RocketOutlined />
          </span>
          <h1 className="login__title">Create your free account</h1>
          <p className="login__subtitle">Free for up to 10 staff. No credit card required.</p>

          <Alert>{error}</Alert>

          {field('companyName', 'Company name', {
            autoComplete: 'organization',
            placeholder: 'Your company',
            prefix: <BankOutlined className="login__input-icon" />,
            required: true,
          })}
          {field('name', 'Your name', {
            autoComplete: 'name',
            placeholder: 'Full name',
            prefix: <UserOutlined className="login__input-icon" />,
            required: true,
          })}
          {field('email', 'Work email', {
            type: 'email',
            autoComplete: 'username',
            placeholder: 'you@company.com',
            prefix: <MailOutlined className="login__input-icon" />,
            hint: 'You will log in with this email.',
            required: true,
          })}
          {field('phone', 'Phone', {
            type: 'tel',
            autoComplete: 'tel',
            placeholder: 'Optional',
            prefix: <PhoneOutlined className="login__input-icon" />,
          })}
          {field('password', 'Password', {
            type: 'password',
            autoComplete: 'new-password',
            placeholder: 'At least 8 characters',
            prefix: <LockOutlined className="login__input-icon" />,
            required: true,
          })}

          <Button type="submit" block loading={submitting} className="login__submit" icon={<ArrowRightOutlined />} iconPlacement="end">
            Create Account
          </Button>

          <Divider plain className="login__divider">
            Already registered?
          </Divider>
          <Link to="/login" className="login__alt">
            Log in to your account
          </Link>
        </form>
        <AuthFoot />
      </main>
    </div>
  );
}
