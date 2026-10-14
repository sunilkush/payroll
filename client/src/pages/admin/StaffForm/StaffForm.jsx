import { useEffect, useState } from 'react';
import { Card } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getSettingsApi } from '../../../api/settingsApi.js';
import { createStaffApi, getStaffApi, updateStaffApi } from '../../../api/staffApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import Checkbox from '../../../components/Checkbox/Checkbox.jsx';
import FormActions from '../../../components/FormActions/FormActions.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import Loader from '../../../components/Loader/Loader.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { toFieldErrors } from '../../../utils/formErrors.js';
import { formatCurrency, grossSalary } from '../../../utils/format.js';
import './StaffForm.css';

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  employeeCode: '',
  department: '',
  designation: '',
  joiningDate: '',
  basic: '',
  hra: '',
  special: '',
  other: '',
  pfApplicable: false,
  esiApplicable: false,
  isSalesManager: false,
  branchId: '',
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
  department: staff.department ?? '',
  designation: staff.designation ?? '',
  joiningDate: staff.joiningDate ? staff.joiningDate.slice(0, 10) : '',
  basic: String(staff.salaryStructure?.basic ?? ''),
  hra: String(staff.salaryStructure?.hra ?? ''),
  special: String(staff.salaryStructure?.special ?? ''),
  other: String(staff.salaryStructure?.other ?? ''),
  pfApplicable: staff.pfApplicable,
  esiApplicable: staff.esiApplicable,
  isSalesManager: Boolean(staff.isSalesManager),
  branchId: staff.branchId ?? '',
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
  department: form.department?.trim() || '',
  designation: form.designation?.trim() || '',
  joiningDate: form.joiningDate || null,
  salaryStructure: {
    basic: toAmount(form.basic),
    hra: toAmount(form.hra),
    special: toAmount(form.special),
    other: toAmount(form.other),
  },
  pfApplicable: form.pfApplicable,
  esiApplicable: form.esiApplicable,
  isSalesManager: form.isSalesManager,
  // Branch wali holidays isi se lagti hain; khali = koi branch nahi
  branchId: form.branchId || null,
  uan: form.uan,
  esicNo: form.esicNo,
  bankDetails: { accountNo: form.accountNo, ifsc: form.ifsc, bankName: form.bankName },
});

export default function StaffForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { company } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  // Top bar mein dikhne wala naam; type karte waqt na badle isliye form se alag
  const [savedName, setSavedName] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState([]); // company ki office locations

  useEffect(() => {
    getSettingsApi()
      .then((res) => setBranches(res.data.company.locations.map((location) => ({ value: location._id, label: location.name }))))
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    if (!isEdit) return undefined;
    let ignore = false;
    getStaffApi(id)
      .then((res) => {
        if (ignore) return;
        setForm(toForm(res.data.staff));
        setSavedName(res.data.staff.name);
      })
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
        state: { message: `${form.name} ${isEdit ? 'updated' : 'added'}.` },
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
      <PageHeader
        detail
        title={isEdit ? (savedName ? `Edit ${savedName}` : 'Edit staff') : 'Add staff'}
        back={{ to: '/admin/staff', label: 'Staff' }}
      />

      {loadError ? (
        <Alert>{loadError}</Alert>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <Alert>{error}</Alert>

          <Card className="staff-form__section" size="small" title="Personal Details">
            <div className="staff-form__grid">
              {field('name', 'Full name', 'name', { required: true })}
              {field('employeeCode', 'Employee code', 'employeeCode', {
                required: true,
                hint: 'Unique within the company, e.g. EMP001',
              })}
              {field('email', 'Email', 'email', {
                type: 'email',
                required: true,
                autoComplete: 'off',
                hint: 'The staff member will log in with this email',
              })}
              {field('phone', 'Phone', 'phone', { type: 'tel' })}
              {field('department', 'Department', 'department', {
                placeholder: 'e.g. Sales, Operations, HR, IT',
              })}
              {field('designation', 'Designation', 'designation', {
                placeholder: 'e.g. Sales Executive, Team Lead, Manager',
              })}
              {field('joiningDate', 'Joining date', 'joiningDate', { type: 'date' })}
              {branches.length > 0 &&
                field('branchId', 'Branch', 'branchId', {
                  options: [{ value: '', label: 'No branch' }, ...branches],
                  hint: 'Holidays set for a branch apply only to its staff',
                })}
              {field('password', isEdit ? 'New password' : 'Password', 'password', {
                type: 'password',
                required: !isEdit,
                autoComplete: 'new-password',
                hint: isEdit ? 'Leave blank to keep the current password' : 'At least 8 characters',
              })}
            </div>
          </Card>

          <Card className="staff-form__section" size="small" title="Salary Structure (monthly)">
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
          </Card>

          <Card className="staff-form__section" size="small" title="PF & ESI">
            <div className="staff-form__grid">
              <div>
                <Checkbox
                  label="PF applicable"
                  name="pfApplicable"
                  checked={form.pfApplicable}
                  onChange={handleChange}
                  hint="Deducted only if PF is ON in company settings"
                />
                {field('uan', 'UAN', 'uan', { inputMode: 'numeric', hint: '12 digits' })}
              </div>
              <div>
                <Checkbox
                  label="ESI applicable"
                  name="esiApplicable"
                  checked={form.esiApplicable}
                  onChange={handleChange}
                  hint="Deducted only if ESI is ON in company settings"
                />
                {field('esicNo', 'ESIC number', 'esicNo', { inputMode: 'numeric' })}
              </div>
            </div>
          </Card>

          {company?.salesEnabled && (
            <Card className="staff-form__section" size="small" title="Sales">
              <Checkbox
                label="Sales manager"
                name="isSalesManager"
                checked={form.isSalesManager}
                onChange={handleChange}
                hint="Client meetings can be assigned to this staff member"
              />
            </Card>
          )}

          <Card className="staff-form__section" size="small" title="Bank Details">
            <div className="staff-form__grid">
              {field('accountNo', 'Account number', 'bankDetails.accountNo', { inputMode: 'numeric' })}
              {field('ifsc', 'IFSC', 'bankDetails.ifsc', { hint: 'e.g. SBIN0001234' })}
              {field('bankName', 'Bank name', 'bankDetails.bankName')}
            </div>
          </Card>

          <FormActions>
            <Button variant="secondary" onClick={() => navigate('/admin/staff')}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Staff'}
            </Button>
          </FormActions>
        </form>
      )}
    </section>
  );
}
