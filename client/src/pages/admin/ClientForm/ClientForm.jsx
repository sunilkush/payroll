import { useEffect, useState } from 'react';
import { Card } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { createClientApi, getClientApi, updateClientApi } from '../../../api/clientApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import FormActions from '../../../components/FormActions/FormActions.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import Loader from '../../../components/Loader/Loader.jsx';
import LocationMap from '../../../components/LocationMap/LocationMap.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import { toFieldErrors } from '../../../utils/formErrors.js';
import './ClientForm.css';

const EMPTY_FORM = { name: '', contactPerson: '', phone: '', email: '', address: '', lat: '', lng: '', notes: '' };

const toForm = (client) => ({
  name: client.name,
  contactPerson: client.contactPerson ?? '',
  phone: client.phone ?? '',
  email: client.email ?? '',
  address: client.address ?? '',
  lat: client.lat == null ? '' : String(client.lat),
  lng: client.lng == null ? '' : String(client.lng),
  notes: client.notes ?? '',
});

// Location khali ho to null (server par hat jati hai); lat aur lng hamesha saath jaate hain.
const toPayload = ({ lat, lng, ...rest }) => ({
  ...rest,
  lat: lat === '' ? null : Number(lat),
  lng: lng === '' ? null : Number(lng),
});

export default function ClientForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  // Top bar mein dikhne wala naam; type karte waqt na badle isliye form se alag
  const [savedName, setSavedName] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return undefined;
    let ignore = false;
    getClientApi(id)
      .then((res) => {
        if (ignore) return;
        setForm(toForm(res.data.client));
        setSavedName(res.data.client.name);
      })
      .catch((err) => !ignore && setLoadError(err.message))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [id, isEdit]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      const payload = toPayload(form);
      if (isEdit) await updateClientApi(id, payload);
      else await createClientApi(payload);
      navigate('/admin/clients', { state: { message: `${form.name} ${isEdit ? 'updated' : 'added'}.` } });
    } catch (err) {
      setError(err.message);
      setFieldErrors(toFieldErrors(err));
      setSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) return <Loader />;

  const field = (name, label, extra = {}) => (
    <FormField label={label} name={name} value={form[name]} onChange={handleChange} error={fieldErrors[name]} {...extra} />
  );

  return (
    <section className="client-form">
      <PageHeader
        detail
        title={isEdit ? (savedName ? `Edit ${savedName}` : 'Edit client') : 'Add client'}
        back={{ to: '/admin/clients', label: 'Clients' }}
      />

      {loadError ? (
        <Alert>{loadError}</Alert>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <Alert>{error}</Alert>

          <Card className="client-form__section" size="small" title="Client Details">
            <div className="client-form__grid">
              {field('name', 'Client name', { required: true, placeholder: 'ABC Pvt Ltd' })}
              {field('contactPerson', 'Contact person')}
              {field('phone', 'Phone', { type: 'tel' })}
              {field('email', 'Email', { type: 'email' })}
            </div>
            {field('address', 'Address', { multiline: true, maxLength: 300 })}
            {field('notes', 'Notes', { multiline: true, maxLength: 1000 })}
          </Card>

          <Card className="client-form__section" size="small" title="Location (optional)">
            <p className="client-form__help">
              Pin the client&apos;s office on the map. New meetings for this client start with this location, and the
              sales manager must be near it to check in.
            </p>
            <div className="client-form__grid">
              {field('lat', 'Latitude', { type: 'number', step: 'any' })}
              {field('lng', 'Longitude', { type: 'number', step: 'any' })}
            </div>
            <LocationMap
              lat={form.lat}
              lng={form.lng}
              hint="Click the map or drag the pin to set the client's location."
              onPick={(lat, lng) => setForm((prev) => ({ ...prev, lat: lat.toFixed(6), lng: lng.toFixed(6) }))}
            />
            {form.lat !== '' && (
              <Button size="sm" variant="secondary" onClick={() => setForm((prev) => ({ ...prev, lat: '', lng: '' }))}>
                Remove location
              </Button>
            )}
          </Card>

          <FormActions>
            <Button variant="secondary" onClick={() => navigate('/admin/clients')}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Client'}
            </Button>
          </FormActions>
        </form>
      )}
    </section>
  );
}
