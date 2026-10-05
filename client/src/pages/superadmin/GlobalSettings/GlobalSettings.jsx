import { useEffect, useState } from 'react';
import { Card } from 'antd';
import { getGlobalSettingsApi, updateGlobalSettingsApi } from '../../../api/globalSettingsApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import FormActions from '../../../components/FormActions/FormActions.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import Loader from '../../../components/Loader/Loader.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import { toFieldErrors } from '../../../utils/formErrors.js';
import { useFeedback } from '../../../utils/useFeedback.js';
import './GlobalSettings.css';

// group: API ka object (pf / esi). group na ho to top-level field.
const SECTIONS = [
  {
    title: 'Payroll',
    fields: [
      {
        name: 'payrollDaysBasis',
        label: 'Days basis',
        hint: 'Per day salary = Monthly gross / this many days (fixed every month)',
        step: '1',
      },
    ],
  },
  {
    title: 'PF (EPF)',
    group: 'pf',
    fields: [
      { name: 'employeeRate', label: 'Employee rate (%)' },
      { name: 'employerRate', label: 'Employer rate (%)', hint: 'EPS is taken out of this; the rest goes to EPF' },
      { name: 'epsRate', label: 'EPS rate (%)' },
      { name: 'wageCeiling', label: 'Wage ceiling (Rs.)', hint: 'PF stops at this amount when a company keeps "cap at ceiling" ON' },
      { name: 'edliRate', label: 'EDLI rate (%)', hint: 'Employer extra, for reports only' },
      { name: 'adminRate', label: 'Admin charges (%)', hint: 'Employer extra, for reports only' },
      {
        name: 'wageFloorPercent',
        label: 'PF wage floor (% of gross)',
        hint: 'New Labour Codes: PF wage is treated as at least this % of gross. 0 = rule off',
      },
    ],
  },
  {
    title: 'ESI',
    group: 'esi',
    fields: [
      { name: 'employeeRate', label: 'Employee rate (%)' },
      { name: 'employerRate', label: 'Employer rate (%)' },
      { name: 'wageLimit', label: 'Wage limit (Rs.)', hint: 'ESI does not apply if monthly gross is above this' },
    ],
  },
];

const keyOf = (section, field) => (section.group ? `${section.group}.${field.name}` : field.name);

// settings object <-> { 'pf.employeeRate': '12', ... }
function toForm(settings) {
  const form = {};
  for (const section of SECTIONS) {
    for (const field of section.fields) {
      const source = section.group ? settings[section.group] : settings;
      form[keyOf(section, field)] = String(source[field.name]);
    }
  }
  return form;
}

function toPayload(form) {
  const payload = {};
  for (const section of SECTIONS) {
    for (const field of section.fields) {
      const raw = form[keyOf(section, field)];
      const value = raw === '' ? undefined : Number(raw);
      if (section.group) payload[section.group] = { ...payload[section.group], [field.name]: value };
      else payload[field.name] = value;
    }
  }
  return payload;
}

export default function GlobalSettings() {
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState('');
  const { toast } = useFeedback();
  // notify({ type: 'success' | 'error', text }): upar toast dikhata hai
  const notify = ({ type, text }) => text && toast[type](text);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGlobalSettingsApi()
      .then((res) => setForm(toForm(res.data.settings)))
      .catch((err) => setLoadError(err.message));
  }, []);

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!form) return <Loader />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      const res = await updateGlobalSettingsApi(toPayload(form));
      setForm(toForm(res.data.settings));
      notify({ type: 'success', text: 'Global settings saved.' });
    } catch (err) {
      setFieldErrors(toFieldErrors(err));
      notify({ type: 'error', text: err.errors?.[0]?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="global-settings">
      <PageHeader title="Global Settings" subtitle="PF/ESI rates and ceilings for all companies" />
      <p className="global-settings__note">
        These numbers apply to new payroll for every company. Existing payroll does not change until an
        admin clicks Regenerate; finalized payroll never changes. Confirm with your CA before changing
        the rates.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {SECTIONS.map((section) => (
          <Card key={section.title} className="global-settings__section" size="small" title={section.title}>
            <div className="global-settings__grid">
              {section.fields.map((field) => {
                const key = keyOf(section, field);
                return (
                  <FormField
                    key={key}
                    label={field.label}
                    name={key}
                    type="number"
                    min="0"
                    step={field.step ?? 'any'}
                    value={form[key]}
                    onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                    error={fieldErrors[key]}
                    hint={field.hint}
                    required
                  />
                );
              })}
            </div>
          </Card>
        ))}

        <FormActions>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </FormActions>
      </form>
    </section>
  );
}
