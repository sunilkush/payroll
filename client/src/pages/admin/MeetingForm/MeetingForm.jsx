import { useEffect, useState } from 'react';
import { Card } from 'antd';
import dayjs from 'dayjs';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listClientsApi } from '../../../api/clientApi.js';
import { createMeetingApi, getMeetingApi, updateMeetingApi } from '../../../api/meetingApi.js';
import { listStaffApi } from '../../../api/staffApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import FormActions from '../../../components/FormActions/FormActions.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import Loader from '../../../components/Loader/Loader.jsx';
import LocationMap from '../../../components/LocationMap/LocationMap.jsx';
import { isOpenMeeting } from '../../../components/MeetingStatus/MeetingStatus.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import { toFieldErrors } from '../../../utils/formErrors.js';
import { addMinutes, endAfter, todayLocal } from '../../../utils/format.js';
import './MeetingForm.css';

const DEFAULT_RADIUS = '100';
const EMPTY_FORM = {
  clientId: '',
  contactPerson: '',
  contactPhone: '',
  title: '',
  purpose: '',
  salesManagerId: '',
  date: '',
  startTime: '',
  endTime: '',
  locationName: '',
  address: '',
  lat: '',
  lng: '',
  radius: DEFAULT_RADIUS,
  notes: '',
};

const toForm = (meeting) => ({
  clientId: meeting.clientId?._id ?? '',
  contactPerson: meeting.contactPerson ?? '',
  contactPhone: meeting.contactPhone ?? '',
  title: meeting.title,
  purpose: meeting.purpose ?? '',
  salesManagerId: meeting.salesManagerId?._id ?? '',
  date: meeting.date,
  startTime: dayjs(meeting.startAt).format('HH:mm'),
  endTime: dayjs(meeting.endAt).format('HH:mm'),
  locationName: meeting.location.name ?? '',
  address: meeting.location.address ?? '',
  lat: String(meeting.location.lat),
  lng: String(meeting.location.lng),
  radius: String(meeting.location.radius),
  notes: meeting.notes ?? '',
});

const toPayload = ({ locationName, address, lat, lng, radius, ...rest }) => ({
  ...rest,
  location: {
    name: locationName,
    address,
    // Khali ho to server client ki saved location lagata hai
    ...(lat !== '' && lng !== '' && { lat: Number(lat), lng: Number(lng) }),
    ...(radius !== '' && { radius: Number(radius) }),
  },
});

// Server ke field names -> form ke field names (errors sahi field ke neeche dikhen)
const ERROR_FIELD = {
  'location.name': 'locationName',
  'location.address': 'address',
  'location.lat': 'lat',
  'location.lng': 'lng',
  'location.radius': 'radius',
};
const mapErrors = (errors) =>
  Object.fromEntries(Object.entries(errors).map(([field, message]) => [ERROR_FIELD[field] ?? field, message]));

export default function MeetingForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const backTo = isEdit ? `/admin/meetings/${id}` : '/admin/meetings';

  const [form, setForm] = useState(EMPTY_FORM);
  const [clients, setClients] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      listClientsApi({ status: 'active', limit: 100 }),
      listStaffApi({ salesManager: true, status: 'active', limit: 100 }),
      isEdit ? getMeetingApi(id) : null,
    ])
      .then(([clientRes, staffRes, meetingRes]) => {
        if (ignore) return;
        setClients(clientRes.data.items);
        setManagers(staffRes.data.items);
        if (!meetingRes) return;
        const { meeting } = meetingRes.data;
        if (!isOpenMeeting(meeting)) setLoadError('This meeting has already started or ended, so it cannot be changed.');
        else setForm(toForm(meeting));
      })
      .catch((err) => !ignore && setLoadError(err.message))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [id, isEdit]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Start chunte hi end ek ghante baad ka bhar jaye (agar khali ho ya start se pehle reh gaya ho).
      if (name === 'startTime' && value && (!prev.endTime || prev.endTime <= value)) next.endTime = addMinutes(value, 60);
      // End mein AM / PM na chuna ho to picker AM maanta hai; start se pehle ho to dopahar ka maan lo.
      if (name === 'endTime') next.endTime = endAfter(next.startTime, value);
      return next;
    });
  };

  // Client chunte hi uska contact aur saved location bhar jati hai (admin badal sakta hai).
  const handleClientChange = (event) => {
    const client = clients.find((item) => item._id === event.target.value);
    setForm((prev) => ({
      ...prev,
      clientId: event.target.value,
      contactPerson: client?.contactPerson ?? '',
      contactPhone: client?.phone ?? '',
      locationName: client?.name ?? '',
      address: client?.address ?? '',
      lat: client?.lat == null ? '' : String(client.lat),
      lng: client?.lng == null ? '' : String(client.lng),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      const payload = toPayload(form);
      const res = isEdit ? await updateMeetingApi(id, payload) : await createMeetingApi(payload);
      navigate(`/admin/meetings/${res.data.meeting._id}`, {
        state: { message: isEdit ? 'Meeting updated.' : 'Meeting created.' },
      });
    } catch (err) {
      setError(err.message);
      setFieldErrors(mapErrors(toFieldErrors(err)));
      setSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) return <Loader />;

  const field = (name, label, extra = {}) => (
    <FormField label={label} name={name} value={form[name]} onChange={handleChange} error={fieldErrors[name]} {...extra} />
  );
  const clientOptions = clients.map((client) => ({ value: client._id, label: client.name }));
  const managerOptions = managers.map((staff) => ({ value: staff._id, label: `${staff.name} (${staff.employeeCode})` }));

  return (
    <section className="meeting-form">
      <PageHeader
        detail
        title={isEdit ? 'Edit meeting' : 'Create meeting'}
        back={{ to: backTo, label: isEdit ? 'Meeting' : 'Meetings' }}
      />

      {loadError ? (
        <Alert>{loadError}</Alert>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <Alert>{error}</Alert>
          {clients.length === 0 && (
            <Alert type="info">
              Add a client first: <Link to="/admin/clients/new">Add client</Link>
            </Alert>
          )}
          {managers.length === 0 && (
            <Alert type="info">
              No sales managers yet. Open a staff member in <Link to="/admin/staff">Staff</Link> and tick &quot;Sales
              manager&quot;.
            </Alert>
          )}

          <Card className="meeting-form__section" size="small" title="Client">
            <div className="meeting-form__grid">
              <FormField
                label="Client"
                name="clientId"
                searchable
                placeholder="Select a client"
                options={clientOptions}
                value={form.clientId}
                onChange={handleClientChange}
                error={fieldErrors.clientId}
                required
              />
              {field('contactPerson', 'Client contact person')}
              {field('contactPhone', 'Client phone', { type: 'tel' })}
            </div>
          </Card>

          <Card className="meeting-form__section" size="small" title="Meeting">
            <div className="meeting-form__grid">
              {field('title', 'Meeting title', { required: true, placeholder: 'Product demo' })}
              <FormField
                label="Assigned sales manager"
                name="salesManagerId"
                searchable
                placeholder="Select a sales manager"
                options={managerOptions}
                value={form.salesManagerId}
                onChange={handleChange}
                error={fieldErrors.salesManagerId}
                required
              />
              {field('date', 'Meeting date', { type: 'date', min: todayLocal(), required: true })}
              {field('startTime', 'Expected start time', { type: 'time', required: true })}
              {field('endTime', 'Expected end time', { type: 'time', required: true })}
            </div>
            {field('purpose', 'Meeting purpose', { multiline: true, maxLength: 500 })}
          </Card>

          <Card className="meeting-form__section" size="small" title="Meeting Location">
            <p className="meeting-form__help">
              The sales manager can check in only inside the dashed circle. Starts with the client&apos;s saved
              location; move the pin if this meeting is somewhere else.
            </p>
            <div className="meeting-form__grid">
              {field('locationName', 'Meeting location', { placeholder: 'ABC Pvt Ltd, Noida' })}
              {field('lat', 'Latitude', { type: 'number', step: 'any', required: true })}
              {field('lng', 'Longitude', { type: 'number', step: 'any', required: true })}
              {field('radius', 'Geofence radius (meters)', {
                type: 'number',
                min: '10',
                max: '5000',
                required: true,
                hint: 'Default 100 m. Use a bigger radius for large campuses.',
              })}
            </div>
            {field('address', 'Address', { multiline: true, maxLength: 300 })}
            <LocationMap
              lat={form.lat}
              lng={form.lng}
              radius={form.radius}
              hint="Click the map or drag the pin to set where the meeting happens. Check-in is allowed only inside the dashed circle."
              onPick={(lat, lng) => setForm((prev) => ({ ...prev, lat: lat.toFixed(6), lng: lng.toFixed(6) }))}
            />
          </Card>

          <Card className="meeting-form__section" size="small" title="Notes">
            {field('notes', 'Notes for the sales manager', { multiline: true, maxLength: 1000 })}
          </Card>

          <FormActions>
            <Button variant="secondary" onClick={() => navigate(backTo)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Meeting'}
            </Button>
          </FormActions>
        </form>
      )}
    </section>
  );
}
