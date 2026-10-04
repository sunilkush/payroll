import { useEffect, useState } from 'react';
import { getGlobalSettingsApi, updateGlobalSettingsApi } from '../../../api/globalSettingsApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import Loader from '../../../components/Loader/Loader.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import { toFieldErrors } from '../../../utils/formErrors.js';
import './GlobalSettings.css';

// group: API ka object (pf / esi). group na ho to top-level field.
const SECTIONS = [
  {
    title: 'Payroll',
    fields: [
      {
        name: 'payrollDaysBasis',
        label: 'Days basis',
        hint: 'Per day salary = Monthly gross / itne din (har mahine fix)',
        step: '1',
      },
    ],
  },
  {
    title: 'PF (EPF)',
    group: 'pf',
    fields: [
      { name: 'employeeRate', label: 'Employee rate (%)' },
      { name: 'employerRate', label: 'Employer rate (%)', hint: 'Isme se EPS nikal kar baaki EPF mein jata hai' },
      { name: 'epsRate', label: 'EPS rate (%)' },
      { name: 'wageCeiling', label: 'Wage ceiling (Rs.)', hint: 'Company "cap at ceiling" ON rakhe to PF isi par rukta hai' },
      { name: 'edliRate', label: 'EDLI rate (%)', hint: 'Employer ka extra, sirf report mein' },
      { name: 'adminRate', label: 'Admin charges (%)', hint: 'Employer ka extra, sirf report mein' },
      {
        name: 'wageFloorPercent',
        label: 'PF wage floor (% of gross)',
        hint: 'Naye Labour Codes: PF wage, gross ke is % se kam nahi maani jaati. 0 = ye rule band',
      },
    ],
  },
  {
    title: 'ESI',
    group: 'esi',
    fields: [
      { name: 'employeeRate', label: 'Employee rate (%)' },
      { name: 'employerRate', label: 'Employer rate (%)' },
      { name: 'wageLimit', label: 'Wage limit (Rs.)', hint: 'Monthly gross is se zyada ho to ESI lagu nahi' },
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
  const [message, setMessage] = useState({ type: 'success', text: '' });
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
    setMessage({ type: 'success', text: '' });
    try {
      const res = await updateGlobalSettingsApi(toPayload(form));
      setForm(toForm(res.data.settings));
      setMessage({ type: 'success', text: 'Global settings save ho gayi.' });
    } catch (err) {
      setFieldErrors(toFieldErrors(err));
      setMessage({ type: 'error', text: err.errors?.[0]?.message || err.message });
    } finally {
      setSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section className="global-settings">
      <PageHeader title="Global Settings" subtitle="PF/ESI ke rates aur ceilings, saari companies ke liye" />
      <Alert type={message.type}>{message.text}</Alert>
      <p className="global-settings__note">
        Ye numbers har company ki nayi payroll par lagu hote hain. Pehle se bani payroll tab tak nahi
        badalti jab tak admin Regenerate na kare; final ho chuki payroll kabhi nahi badalti. Rates
        badalne se pehle apne CA se confirm kar lein.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {SECTIONS.map((section) => (
          <fieldset key={section.title} className="global-settings__section">
            <legend className="global-settings__legend">{section.title}</legend>
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
          </fieldset>
        ))}

        <div className="global-settings__actions">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </section>
  );
}
