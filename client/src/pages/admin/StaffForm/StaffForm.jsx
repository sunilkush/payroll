import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createStaffApi, getStaffApi, updateStaffApi } from '../../../api/staffApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import Checkbox from '../../../components/Checkbox/Checkbox.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import Loader from '../../../components/Loader/Loader.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import { toFieldErrors } from '../../../utils/formErrors.js';
import { formatCurrency, grossSalary } from '../../../utils/format.js';
import './StaffForm.css';

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  employeeCode: '',
  joiningDate: '',
  basic: '',
  hra: '',
  special: '',
  other: '',
  pfApplicable: false,
  esiApplicable: false,
  uan: '',
  esicNo: '',
  accountNo: '',
  ifsc: '',
  bankName: '',
};

const SALARY_FIELDS = [
  { name: 'basic', label: 'Basic', required: true },
  { name: 'hra', label: 'HRA' },
  { name: 'special', label: 'Special Allowance' },
  { name: 'other', label: 'Other' },
];

const toForm = (staff) => ({
  ...EMPTY_FORM,
  name: staff.name,
  email: staff.email,
  phone: staff.phone ?? '',
  employeeCode: staff.employeeCode ?? '',
  joiningDate: staff.joiningDate ? staff.joiningDate.slice(0, 10) : '',
  basic: String(staff.salaryStructure?.basic ?? ''),
  hra: String(staff.salaryStructure?.hra ?? ''),
  special: String(staff.salaryStructure?.special ?? ''),
  other: String(staff.salaryStructure?.other ?? ''),
  pfApplicable: staff.pfApplicable,
  esiApplicable: staff.esiApplicable,
  uan: staff.uan ?? '',
  esicNo: staff.esicNo ?? '',
  accountNo: staff.bankDetails?.accountNo ?? '',
  ifsc: staff.bankDetails?.ifsc ?? '',
  bankName: staff.bankDetails?.bankName ?? '',
});

const toAmount = (value) => (value === '' ? undefined : Number(value));

const toPayload = (form) => ({
  name: form.name,
  email: form.email,
  phone: form.phone,
  // Edit mein password khali chhodne par purana hi rehta hai.
  ...(form.password && { password: form.password }),
  employeeCode: form.employeeCode,
  joiningDate: form.joiningDate || null,
  salaryStructure: {
    basic: toAmount(form.basic),
    hra: toAmount(form.hra),
    special: toAmount(form.special),
    other: toAmount(form.other),
  },
  pfApplicable: form.pfApplicable,
  esiApplicable: form.esiApplicable,
  uan: form.uan,
  esicNo: form.esicNo,
  bankDetails: { accountNo: form.accountNo, ifsc: form.ifsc, bankName: form.bankName },
});

export default function StaffForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return undefined;
    let ignore = false;
    getStaffApi(id)
      .then((res) => !ignore && setForm(toForm(res.data.staff)))
      .catch((err) => !ignore && setLoadError(err.message))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [id, isEdit]);

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      const payload = toPayload(form);
      if (isEdit) await updateStaffApi(id, payload);
      else await createStaffApi(payload);
      navigate('/admin/staff', {
        state: { message: `${form.name} ${isEdit ? 'update' : 'add'} ho gaya.` },
      });
    } catch (err) {
      setError(err.message);
      setFieldErrors(toFieldErrors(err));
      setSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) return <Loader />;

  const field = (name, label, errorKey = name, extra = {}) => (
    <FormField
      label={label}
      name={name}
      value={form[name]}
      onChange={handleChange}
      error={fieldErrors[errorKey]}
      {...extra}
    />
  );

  return (
    <section className="staff-form">
      <PageHeader title={isEdit ? 'Edit Staff' : 'Add Staff'} back={{ to: '/admin/staff', label: 'Staff' }} />

      {loadError ? (
        <Alert>{loadError}</Alert>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <Alert>{error}</Alert>

          <fieldset className="staff-form__section">
            <legend className="staff-form__legend">Personal Details</legend>
            <div className="staff-form__grid">
              {field('name', 'Full name', 'name', { required: true })}
              {field('employeeCode', 'Employee code', 'employeeCode', {
                required: true,
                hint: 'Company ke andar unique, jaise EMP001',
              })}
              {field('email', 'Email', 'email', {
                type: 'email',
                required: true,
                autoComplete: 'off',
                hint: 'Staff isi email se login karega',
              })}
              {field('phone', 'Phone', 'phone', { type: 'tel' })}
              {field('joiningDate', 'Joining date', 'joiningDate', { type: 'date' })}
              {field('password', isEdit ? 'New password' : 'Password', 'password', {
                type: 'password',
                required: !isEdit,
                autoComplete: 'new-password',
                hint: isEdit ? 'Khali chhodo to password nahi badlega' : 'Kam se kam 8 characters',
              })}
            </div>
          </fieldset>

          <fieldset className="staff-form__section">
            <legend className="staff-form__legend">Salary Structure (monthly)</legend>
            <div className="staff-form__grid">
              {SALARY_FIELDS.map((item) => (
                <FormField
                  key={item.name}
                  label={item.label}
                  name={item.name}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form[item.name]}
                  onChange={handleChange}
                  error={fieldErrors[`salaryStructure.${item.name}`]}
                  required={item.required}
                />
              ))}
            </div>
            <p className="staff-form__gross">
              Monthly Gross: <strong>{formatCurrency(grossSalary(form))}</strong>
            </p>
          </fieldset>

          <fieldset className="staff-form__section">
            <legend className="staff-form__legend">PF &amp; ESI</legend>
            <div className="staff-form__grid">
              <div>
                <Checkbox
                  label="PF applicable"
                  name="pfApplicable"
                  checked={form.pfApplicable}
                  onChange={handleChange}
                  hint="Company settings mein PF ON hone par hi katega"
                />
                {field('uan', 'UAN', 'uan', { inputMode: 'numeric', hint: '12 digits' })}
              </div>
              <div>
                <Checkbox
                  label="ESI applicable"
                  name="esiApplicable"
                  checked={form.esiApplicable}
                  onChange={handleChange}
                  hint="Company settings mein ESI ON hone par hi katega"
                />
                {field('esicNo', 'ESIC number', 'esicNo', { inputMode: 'numeric' })}
              </div>
            </div>
          </fieldset>

          <fieldset className="staff-form__section">
            <legend className="staff-form__legend">Bank Details</legend>
            <div className="staff-form__grid">
              {field('accountNo', 'Account number', 'bankDetails.accountNo', { inputMode: 'numeric' })}
              {field('ifsc', 'IFSC', 'bankDetails.ifsc', { hint: 'Jaise SBIN0001234' })}
              {field('bankName', 'Bank name', 'bankDetails.bankName')}
            </div>
          </fieldset>

          <div className="staff-form__actions">
            <Button variant="secondary" onClick={() => navigate('/admin/staff')}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Staff'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
