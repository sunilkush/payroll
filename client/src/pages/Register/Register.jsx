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
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Alert from '../../components/Alert/Alert.jsx';
import Button from '../../components/Button/Button.jsx';
import FormField from '../../components/FormField/FormField.jsx';
import Loader from '../../components/Loader/Loader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { toFieldErrors } from '../../utils/formErrors.js';
import { homeAfterSignup, saveChosenPlan } from '../../utils/chosenPlan.js';
import { usePlans } from '../../utils/usePlans.js';
import AuthBrand, { AuthFoot, AuthTop } from '../Login/AuthBrand.jsx';
import '../Login/Login.css';
import './Register.css';

const EMPTY_FORM = { companyName: '', name: '', email: '', phone: '', password: '' };

// Naya account: company + uska pehla admin, free trial ke saath. Layout wahi hai jo Login ka.
// Landing page se plan chun kar aaye hon (?plan=PROFESSIONAL) to trial usi plan par chalta hai aur account bante hi
// Plan & Billing khulta hai (wahi plan chuna hua); warna Free par, aur admin dashboard par.
export default function Register() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: catalog } = usePlans();
  // Sirf wahi plan maante hain jo server ke plans mein hai aur jiska daam tay hai (online bikta hai).
  const chosen = catalog?.plans.find((plan) => plan.code === searchParams.get('plan') && plan.monthlyPrice) ?? null;

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Loader />;
  if (user) return <Navigate to={homeAfterSignup(user)} replace />;

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setSubmitting(true);
    try {
      if (chosen) saveChosenPlan(chosen.code);
      const created = await register({ ...form, ...(chosen && { plan: chosen.code }) });
      navigate(homeAfterSignup(created), { replace: true });
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
          <h1 className="login__title">{chosen ? `Start with ${chosen.name}` : 'Create your free account'}</h1>
          <p className="login__subtitle">
            {catalog ? `Free for ${catalog.billing.trialDays} days. ` : ''}No credit card required.
          </p>
          {chosen && (
            <Alert type="info">
              You chose {chosen.name}: ₹{chosen.monthlyPrice.toLocaleString('en-IN')} / month. Your free trial includes everything in
              this plan; you can pay now or any time before the trial ends.
            </Alert>
          )}

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
