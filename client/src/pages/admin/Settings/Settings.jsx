import { useEffect, useState } from 'react';
import { Card } from 'antd';
import { getSettingsApi, updateSettingsApi } from '../../../api/settingsApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import Checkbox from '../../../components/Checkbox/Checkbox.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import Loader from '../../../components/Loader/Loader.jsx';
import LocationMap from '../../../components/LocationMap/LocationMap.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { toFieldErrors } from '../../../utils/formErrors.js';
import { WEEKDAYS } from '../../../utils/format.js';
import { getCurrentPosition } from '../../../utils/geolocation.js';
import './Settings.css';

const NEW_LOCATION = { name: '', lat: '', lng: '', radius: '100' };
const NEW_HOLIDAY = { date: '', name: '' };

// Server ka company object -> form state (inputs ke liye sab string).
const toForm = (company) => ({
  locations: company.locations.map((location) => ({
    _id: location._id,
    name: location.name,
    lat: String(location.lat),
    lng: String(location.lng),
    radius: String(location.radius),
  })),
  holidays: company.holidays.map(({ date, name }) => ({ date, name })),
  maxGpsAccuracy: String(company.settings.maxGpsAccuracy),
  weekOffDays: company.settings.weekOffDays,
  leaveEnabled: company.settings.leaveEnabled,
  clPerMonth: String(company.settings.clPerMonth),
  elPerMonth: String(company.settings.elPerMonth),
  elCarryForwardMax: String(company.settings.elCarryForwardMax),
  allowPastLeave: company.settings.allowPastLeave,
  pfEnabled: company.settings.pfEnabled,
  pfCapAtCeiling: company.settings.pfCapAtCeiling,
  esiEnabled: company.settings.esiEnabled,
});

const toNumber = (value) => (value === '' ? undefined : Number(value));

const toPayload = (form) => ({
  locations: form.locations.map((location) => ({
    ...(location._id && { _id: location._id }),
    name: location.name,
    lat: toNumber(location.lat),
    lng: toNumber(location.lng),
    radius: toNumber(location.radius),
  })),
  holidays: form.holidays,
  settings: {
    maxGpsAccuracy: toNumber(form.maxGpsAccuracy),
    weekOffDays: form.weekOffDays,
    leaveEnabled: form.leaveEnabled,
    clPerMonth: toNumber(form.clPerMonth),
    elPerMonth: toNumber(form.elPerMonth),
    elCarryForwardMax: toNumber(form.elCarryForwardMax),
    allowPastLeave: form.allowPastLeave,
    pfEnabled: form.pfEnabled,
    pfCapAtCeiling: form.pfCapAtCeiling,
    esiEnabled: form.esiEnabled,
  },
});

export default function Settings() {
  const { refresh } = useAuth();
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState({ type: 'success', text: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [locatingIndex, setLocatingIndex] = useState(null);

  useEffect(() => {
    getSettingsApi()
      .then((res) => setForm(toForm(res.data.company)))
      .catch((err) => setLoadError(err.message));
  }, []);

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!form) return <Loader />;

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  // locations / holidays ki list ke helpers
  const updateItem = (list, index, changes) =>
    setField(
      list,
      form[list].map((item, i) => (i === index ? { ...item, ...changes } : item))
    );
  const addItem = (list, item) => setField(list, [...form[list], item]);
  const removeItem = (list, index) =>
    setField(
      list,
      form[list].filter((_, i) => i !== index)
    );

  const handleUseMyLocation = async (index) => {
    setLocatingIndex(index);
    setMessage({ type: 'success', text: '' });
    try {
      const position = await getCurrentPosition();
      updateItem('locations', index, { lat: position.lat.toFixed(6), lng: position.lng.toFixed(6) });
      setMessage({
        type: 'success',
        text: `Location captured (accuracy ${Math.round(position.accuracy)}m). Remember to save.`,
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLocatingIndex(null);
    }
  };

  const toggleWeekOff = (day) => {
    const days = form.weekOffDays.includes(day)
      ? form.weekOffDays.filter((d) => d !== day)
      : [...form.weekOffDays, day].sort();
    setField('weekOffDays', days);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setMessage({ type: 'success', text: '' });
    try {
      const res = await updateSettingsApi(toPayload(form));
      setForm(toForm(res.data.company));
      setMessage({ type: 'success', text: 'Settings saved.' });
      // Navbar/dashboard ke links (jaise Leaves) nayi settings ke hisaab se dikhein.
      await refresh();
    } catch (err) {
      setFieldErrors(toFieldErrors(err));
      setMessage({ type: 'error', text: err.errors?.[0]?.message || err.message });
    } finally {
      setSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section className="settings">
      <PageHeader title="Settings" />
      <Alert type={message.type}>{message.text}</Alert>

      <form onSubmit={handleSubmit} noValidate>
        <Card className="settings__section" size="small" title="Office Locations">
          <p className="settings__help">
            Staff can punch in/out only within the range (radius) of these locations.
          </p>

          {form.locations.length === 0 && (
            <p className="settings__empty">No locations yet. Staff cannot punch without an office location.</p>
          )}

          {form.locations.map((location, index) => (
            <div key={location._id ?? `new-${index}`} className="settings__item">
              <div className="settings__grid">
                <FormField
                  label="Name"
                  name={`location-name-${index}`}
                  value={location.name}
                  onChange={(event) => updateItem('locations', index, { name: event.target.value })}
                  error={fieldErrors[`locations.${index}.name`]}
                  placeholder="Head Office"
                  required
                />
                <FormField
                  label="Latitude"
                  name={`location-lat-${index}`}
                  type="number"
                  step="any"
                  value={location.lat}
                  onChange={(event) => updateItem('locations', index, { lat: event.target.value })}
                  error={fieldErrors[`locations.${index}.lat`]}
                  required
                />
                <FormField
                  label="Longitude"
                  name={`location-lng-${index}`}
                  type="number"
                  step="any"
                  value={location.lng}
                  onChange={(event) => updateItem('locations', index, { lng: event.target.value })}
                  error={fieldErrors[`locations.${index}.lng`]}
                  required
                />
                <FormField
                  label="Radius (meters)"
                  name={`location-radius-${index}`}
                  type="number"
                  min="10"
                  value={location.radius}
                  onChange={(event) => updateItem('locations', index, { radius: event.target.value })}
                  error={fieldErrors[`locations.${index}.radius`]}
                  required
                />
              </div>
              <LocationMap
                lat={location.lat}
                lng={location.lng}
                radius={location.radius}
                onPick={(lat, lng) => updateItem('locations', index, { lat: lat.toFixed(6), lng: lng.toFixed(6) })}
              />
              <div className="settings__item-actions">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={locatingIndex !== null}
                  onClick={() => handleUseMyLocation(index)}
                >
                  {locatingIndex === index ? 'Getting location...' : 'Use my current location'}
                </Button>
                <Button size="sm" variant="danger" onClick={() => removeItem('locations', index)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}

          <Button variant="secondary" onClick={() => addItem('locations', NEW_LOCATION)}>
            + Add Location
          </Button>
        </Card>

        <Card className="settings__section" size="small" title="Attendance Rules">
          <div className="settings__grid">
            <FormField
              label="GPS accuracy limit (meters)"
              name="maxGpsAccuracy"
              type="number"
              min="10"
              value={form.maxGpsAccuracy}
              onChange={(event) => setField('maxGpsAccuracy', event.target.value)}
              error={fieldErrors['settings.maxGpsAccuracy']}
              hint="Punches with worse GPS accuracy than this are rejected"
              required
            />
          </div>
          <p className="settings__label">Week off days (paid)</p>
          <div className="settings__weekdays">
            {WEEKDAYS.map((name, day) => (
              <Checkbox
                key={name}
                label={name}
                name={`weekoff-${day}`}
                checked={form.weekOffDays.includes(day)}
                onChange={() => toggleWeekOff(day)}
              />
            ))}
          </div>
        </Card>

        <Card className="settings__section" size="small" title="Holidays (paid)">
          {form.holidays.length === 0 && <p className="settings__empty">No holidays yet.</p>}

          {form.holidays.map((holiday, index) => (
            <div key={index} className="settings__holiday">
              <FormField
                label="Date"
                name={`holiday-date-${index}`}
                type="date"
                value={holiday.date}
                onChange={(event) => updateItem('holidays', index, { date: event.target.value })}
                error={fieldErrors[`holidays.${index}.date`]}
                required
              />
              <FormField
                label="Name"
                name={`holiday-name-${index}`}
                value={holiday.name}
                onChange={(event) => updateItem('holidays', index, { name: event.target.value })}
                error={fieldErrors[`holidays.${index}.name`]}
                placeholder="Diwali"
                required
              />
              <Button size="sm" variant="danger" onClick={() => removeItem('holidays', index)}>
                Remove
              </Button>
            </div>
          ))}

          <Button variant="secondary" onClick={() => addItem('holidays', NEW_HOLIDAY)}>
            + Add Holiday
          </Button>
        </Card>

        <Card className="settings__section" size="small" title="Leave Management">
          <Checkbox
            label="Leave management enabled"
            name="leaveEnabled"
            checked={form.leaveEnabled}
            onChange={(event) => setField('leaveEnabled', event.target.checked)}
            hint="Staff can apply for leave and CL/EL is credited every month only when this is ON. Turning it ON credits this month immediately."
          />
          {form.leaveEnabled && (
            <>
              <div className="settings__grid">
                <FormField
                  label="CL per month"
                  name="clPerMonth"
                  type="number"
                  min="0"
                  step="0.25"
                  value={form.clPerMonth}
                  onChange={(event) => setField('clPerMonth', event.target.value)}
                  error={fieldErrors['settings.clPerMonth']}
                  required
                />
                <FormField
                  label="EL per month"
                  name="elPerMonth"
                  type="number"
                  min="0"
                  step="0.25"
                  value={form.elPerMonth}
                  onChange={(event) => setField('elPerMonth', event.target.value)}
                  error={fieldErrors['settings.elPerMonth']}
                  hint="1.25 = 15 per year"
                  required
                />
                <FormField
                  label="EL carry forward limit"
                  name="elCarryForwardMax"
                  type="number"
                  min="0"
                  value={form.elCarryForwardMax}
                  onChange={(event) => setField('elCarryForwardMax', event.target.value)}
                  error={fieldErrors['settings.elCarryForwardMax']}
                  hint="At year end, up to this much EL carries forward. CL lapses."
                  required
                />
              </div>
              <Checkbox
                label="Allow leave for past dates"
                name="allowPastLeave"
                checked={form.allowPastLeave}
                onChange={(event) => setField('allowPastLeave', event.target.checked)}
              />
            </>
          )}
        </Card>

        <Card className="settings__section" size="small" title="PF & ESI">
          <p className="settings__help">When OFF, this is not deducted from any staff salary.</p>
          <Checkbox
            label="PF enabled"
            name="pfEnabled"
            checked={form.pfEnabled}
            onChange={(event) => setField('pfEnabled', event.target.checked)}
          />
          {form.pfEnabled && (
            <Checkbox
              label="Cap PF at the wage ceiling"
              name="pfCapAtCeiling"
              checked={form.pfCapAtCeiling}
              onChange={(event) => setField('pfCapAtCeiling', event.target.checked)}
              hint="ON: PF is calculated on wages up to the ceiling (e.g. Rs 15,000). OFF: on actual wages."
            />
          )}
          <Checkbox
            label="ESI enabled"
            name="esiEnabled"
            checked={form.esiEnabled}
            onChange={(event) => setField('esiEnabled', event.target.checked)}
          />
        </Card>

        <div className="settings__actions">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </section>
  );
}
