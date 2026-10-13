import { useEffect, useState } from 'react';
import { Card } from 'antd';
import { getGlobalSettingsApi, updateGlobalSettingsApi } from '../../../api/globalSettingsApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import Checkbox from '../../../components/Checkbox/Checkbox.jsx';
import FormActions from '../../../components/FormActions/FormActions.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import Loader from '../../../components/Loader/Loader.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import { toFieldErrors } from '../../../utils/formErrors.js';
import { useFeedback } from '../../../utils/useFeedback.js';
import { getPlansApi } from '../../../utils/usePlans.js';
import './GlobalSettings.css';

// group: API ka object (billing / pf / esi). group na ho to top-level field.
const SECTIONS = [
  {
    title: 'Billing rules',
    group: 'billing',
    fields: [
      { name: 'months', label: 'Billing period (months)', hint: 'Prices show per month; the payment is taken for this many months at once', step: '1' },
      { name: 'gstPercent', label: 'GST (%)', hint: 'Added on top of the plan amount' },
      { name: 'trialDays', label: 'Free trial (days)', hint: 'For companies that register on the website. Applies to new registrations', step: '1' },
    ],
  },
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

// Packages: code (FREE, STARTER...) fix hai, baaki sab yahan se badalta hai.
const PLAN_CODES = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
const blankIfNull = (value) => (value === null || value === undefined ? '' : String(value));
const nullIfBlank = (value) => (value === '' ? null : Number(value));

// settings.plans <-> form (number wale fields string; khali = Custom daam / unlimited staff)
const toPlanForm = (plans) =>
  Object.fromEntries(
    PLAN_CODES.map((code) => [
      code,
      {
        name: plans[code].name,
        subtitle: plans[code].subtitle ?? '',
        monthlyPrice: blankIfNull(plans[code].monthlyPrice),
        staffLimit: blankIfNull(plans[code].staffLimit),
        features: plans[code].features,
      },
    ])
  );

const toPlanPayload = (plans) =>
  Object.fromEntries(
    PLAN_CODES.map((code) => {
      const { monthlyPrice, staffLimit, ...rest } = plans[code];
      // Free ka daam hamesha 0 hai, isliye bheja hi nahi jata.
      return [code, { ...rest, staffLimit: nullIfBlank(staffLimit), ...(code !== 'FREE' && { monthlyPrice: nullIfBlank(monthlyPrice) }) }];
    })
  );

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
  const [plans, setPlans] = useState(null); // { STARTER: { name, subtitle, monthlyPrice, staffLimit, features }, ... }
  const [featureLabels, setFeatureLabels] = useState({});
  const [loadError, setLoadError] = useState('');
  const { toast } = useFeedback();
  // notify({ type: 'success' | 'error', text }): upar toast dikhata hai
  const notify = ({ type, text }) => text && toast[type](text);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getGlobalSettingsApi(), getPlansApi()])
      .then(([res, planRes]) => {
        setForm(toForm(res.data.settings));
        setPlans(toPlanForm(res.data.settings.plans));
        setFeatureLabels(planRes.data.featureLabels);
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!form || !plans) return <Loader />;

  const setPlan = (code, field, value) => setPlans((prev) => ({ ...prev, [code]: { ...prev[code], [field]: value } }));
  const toggleFeature = (code, feature, on) =>
    setPlan(code, 'features', on ? [...plans[code].features, feature] : plans[code].features.filter((item) => item !== feature));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      const res = await updateGlobalSettingsApi({ ...toPayload(form), plans: toPlanPayload(plans) });
      setForm(toForm(res.data.settings));
      setPlans(toPlanForm(res.data.settings.plans));
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
      <PageHeader title="Global Settings" subtitle="Packages, billing rules and PF/ESI rates for all companies" />
      <p className="global-settings__note">
        Package changes apply at once: prices on the website and the billing page, staff limits and features for every
        company on that package (a removed feature is switched off for them). The PF/ESI numbers apply to new payroll for every company. Existing payroll does not change until an
        admin clicks Regenerate; finalized payroll never changes. Confirm with your CA before changing
        the rates.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {PLAN_CODES.map((code) => {
          const plan = plans[code];
          const field = (name) => `plans.${code}.${name}`;
          return (
            <Card key={code} className="global-settings__section" size="small" title={`Package: ${plan.name || code}`}>
              <div className="global-settings__grid">
                <FormField
                  label="Name"
                  name={field('name')}
                  maxLength={40}
                  value={plan.name}
                  onChange={(event) => setPlan(code, 'name', event.target.value)}
                  error={fieldErrors[field('name')]}
                  required
                />
                <FormField
                  label="Subtitle"
                  name={field('subtitle')}
                  maxLength={120}
                  value={plan.subtitle}
                  onChange={(event) => setPlan(code, 'subtitle', event.target.value)}
                  error={fieldErrors[field('subtitle')]}
                />
                {code !== 'FREE' && (
                  <FormField
                    label="Price per month (Rs.)"
                    name={field('monthlyPrice')}
                    type="number"
                    min="0"
                    step="any"
                    value={plan.monthlyPrice}
                    onChange={(event) => setPlan(code, 'monthlyPrice', event.target.value)}
                    error={fieldErrors[field('monthlyPrice')]}
                    hint="Without GST. Leave empty for Custom: the plan is then not sold online"
                  />
                )}
                <FormField
                  label="Staff limit"
                  name={field('staffLimit')}
                  type="number"
                  min="1"
                  step="1"
                  value={plan.staffLimit}
                  onChange={(event) => setPlan(code, 'staffLimit', event.target.value)}
                  error={fieldErrors[field('staffLimit')]}
                  hint="Active staff allowed. Leave empty for unlimited"
                />
              </div>
              <p className="global-settings__label">Features (staff, attendance and dashboard are in every package)</p>
              <div className="global-settings__features">
                {Object.entries(featureLabels).map(([feature, label]) => (
                  <Checkbox
                    key={feature}
                    name={`${field('features')}.${feature}`}
                    label={label}
                    checked={plan.features.includes(feature)}
                    onChange={(event) => toggleFeature(code, feature, event.target.checked)}
                  />
                ))}
              </div>
            </Card>
          );
        })}

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
