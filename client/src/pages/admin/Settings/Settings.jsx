import { useEffect, useState } from 'react';
import { getSettingsApi, updateSettingsApi } from '../../../api/settingsApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import Checkbox from '../../../components/Checkbox/Checkbox.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import Loader from '../../../components/Loader/Loader.jsx';
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
        text: `Location mil gayi (accuracy ${Math.round(position.accuracy)}m). Save karna na bhoolein.`,
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
      setMessage({ type: 'success', text: 'Settings save ho gayi.' });
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
        <fieldset className="settings__section">
          <legend className="settings__legend">Office Locations</legend>
          <p className="settings__help">
            Staff sirf in locations ki range (radius) ke andar punch in/out kar sakta hai.
          </p>

          {form.locations.length === 0 && (
            <p className="settings__empty">Abhi koi location nahi hai. Bina location ke staff punch nahi kar payega.</p>
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
              <div className="settings__item-actions">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={locatingIndex !== null}
                  onClick={() => handleUseMyLocation(index)}
                >
                  {locatingIndex === index ? 'Location le rahe hain...' : 'Use my current location'}
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
        </fieldset>

        <fieldset className="settings__section">
          <legend className="settings__legend">Attendance Rules</legend>
          <div className="settings__grid">
            <FormField
              label="GPS accuracy limit (meters)"
              name="maxGpsAccuracy"
              type="number"
              min="10"
              value={form.maxGpsAccuracy}
              onChange={(event) => setField('maxGpsAccuracy', event.target.value)}
              error={fieldErrors['settings.maxGpsAccuracy']}
              hint="GPS accuracy is se kharab ho to punch reject hota hai"
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
        </fieldset>

        <fieldset className="settings__section">
          <legend className="settings__legend">Holidays (paid)</legend>
          {form.holidays.length === 0 && <p className="settings__empty">Abhi koi holiday nahi hai.</p>}

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
        </fieldset>

        <fieldset className="settings__section">
          <legend className="settings__legend">Leave Management</legend>
          <Checkbox
            label="Leave management enabled"
            name="leaveEnabled"
            checked={form.leaveEnabled}
            onChange={(event) => setField('leaveEnabled', event.target.checked)}
            hint="ON hone par hi staff leave apply kar sakta hai aur har mahine CL/EL credit hota hai. ON karte hi is mahine ka credit lag jata hai."
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
                  hint="1.25 = saal ke 15"
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
                  hint="Saal ke end mein itni EL agle saal jaati hai. CL lapse ho jaati hai."
                  required
                />
              </div>
              <Checkbox
                label="Beeti hui dates ki leave allow karein"
                name="allowPastLeave"
                checked={form.allowPastLeave}
                onChange={(event) => setField('allowPastLeave', event.target.checked)}
              />
            </>
          )}
        </fieldset>

        <fieldset className="settings__section">
          <legend className="settings__legend">PF &amp; ESI</legend>
          <p className="settings__help">OFF hone par kisi bhi staff ki salary se ye deduction nahi katega.</p>
          <Checkbox
            label="PF enabled"
            name="pfEnabled"
            checked={form.pfEnabled}
            onChange={(event) => setField('pfEnabled', event.target.checked)}
          />
          {form.pfEnabled && (
            <Checkbox
              label="PF ko wage ceiling par cap karein"
              name="pfCapAtCeiling"
              checked={form.pfCapAtCeiling}
              onChange={(event) => setField('pfCapAtCeiling', event.target.checked)}
              hint="ON: PF ceiling (jaise Rs 15,000) tak ke wage par katega. OFF: actual wage par."
            />
          )}
          <Checkbox
            label="ESI enabled"
            name="esiEnabled"
            checked={form.esiEnabled}
            onChange={(event) => setField('esiEnabled', event.target.checked)}
          />
        </fieldset>

        <div className="settings__actions">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </section>
  );
}
