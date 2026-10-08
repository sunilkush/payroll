import { useEffect, useState } from 'react';
import { CheckCircleFilled, QrcodeOutlined } from '@ant-design/icons';
import { Card } from 'antd';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { checkOutMeetingApi, getMeetingApi } from '../../../api/meetingApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import Loader from '../../../components/Loader/Loader.jsx';
import MeetingEvidence from '../../../components/MeetingEvidence/MeetingEvidence.jsx';
import MeetingStatus, {
  formatDuration,
  isOpenMeeting,
  LocationStatus,
  OUTCOME_LABEL,
} from '../../../components/MeetingStatus/MeetingStatus.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { toFieldErrors } from '../../../utils/formErrors.js';
import { formatCurrency, formatDate, formatTime, todayLocal } from '../../../utils/format.js';
import { getCurrentPosition } from '../../../utils/geolocation.js';
import { useFeedback } from '../../../utils/useFeedback.js';
import './MeetingVisit.css';

const OUTCOME_OPTIONS = Object.entries(OUTCOME_LABEL).map(([value, label]) => ({ value, label }));
const INTERESTED_OPTIONS = [
  { value: '', label: 'Not sure' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];
const EMPTY_FORM = {
  outcome: '',
  clientInterested: '',
  requirement: '',
  estimatedDealValue: '',
  followUpDate: '',
  followUpTime: '',
  followUpNotes: '',
  remarks: '',
  clientFeedback: '',
};

const toPayload = (form, position) => ({
  ...position,
  result: {
    outcome: form.outcome || undefined,
    clientInterested: form.clientInterested === '' ? null : form.clientInterested === 'yes',
    requirement: form.requirement,
    estimatedDealValue: form.estimatedDealValue === '' ? null : Number(form.estimatedDealValue),
    remarks: form.remarks,
    clientFeedback: form.clientFeedback,
  },
  followUp: { date: form.followUpDate, time: form.followUpTime, notes: form.followUpNotes },
});

// Server ke field names -> form ke field names (errors sahi field ke neeche dikhen)
const ERROR_FIELD = {
  'result.outcome': 'outcome',
  'result.clientInterested': 'clientInterested',
  'result.requirement': 'requirement',
  'result.estimatedDealValue': 'estimatedDealValue',
  'result.remarks': 'remarks',
  'result.clientFeedback': 'clientFeedback',
  'followUp.date': 'followUpDate',
  'followUp.time': 'followUpTime',
  'followUp.notes': 'followUpNotes',
};
const mapErrors = (errors) =>
  Object.fromEntries(Object.entries(errors).map(([field, message]) => [ERROR_FIELD[field] ?? field, message]));

const directionsUrl = ({ lat, lng }) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

// Check-in / check-out ki ek line
function Punch({ label, punch }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>
        {formatTime(punch.at)} <LocationStatus status={punch.locationStatus} />
        {punch.distance != null && <span className="meeting-visit__muted"> {punch.distance} m from the location</span>}
      </dd>
    </>
  );
}

// Sales manager ki ek meeting: jaankari, chalu visit ka check-out + result form, aur poori hui visit ka saar.
// Page refresh ke baad bhi yahin se visit aage badhti hai (haalat server se aati hai).
export default function MeetingVisit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useFeedback();
  const { company } = useAuth();

  const [meeting, setMeeting] = useState(null);
  const [loadError, setLoadError] = useState('');
  // Scan page check-in ke turant baad yahan bhejta hai
  const [justCheckedIn] = useState(Boolean(location.state?.justCheckedIn));

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  // '' | 'Getting your location...' | 'Saving...'
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let ignore = false;
    getMeetingApi(id)
      .then((res) => !ignore && setMeeting(res.data.meeting))
      .catch((err) => !ignore && setLoadError(err.message));
    return () => {
      ignore = true;
    };
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckOut = async (event) => {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    if (!form.outcome) {
      setFieldErrors({ outcome: 'Choose the meeting outcome.' });
      return;
    }
    if (company?.requireVisitPhoto && !meeting.visitPhoto) {
      setFieldErrors({ visitPhoto: 'Take a visit photo before completing the meeting.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Location mil jaye to saath jati hai; na mile to bhi check-out hota hai (server ise note kar leta hai),
    // warna GPS ki dikkat mein visit khuli hi reh jati.
    setBusy('Getting your location...');
    let position = {};
    try {
      position = await getCurrentPosition();
    } catch (err) {
      toast.warning(`${err.message} Checking out without location.`);
    }

    setBusy('Saving...');
    try {
      const res = await checkOutMeetingApi(id, toPayload(form, position));
      setMeeting(res.data.meeting);
      setShowForm(false);
      toast.success('Meeting completed.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
      setFieldErrors(mapErrors(toFieldErrors(err)));
    } finally {
      setBusy('');
    }
  };

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!meeting) return <Loader />;

  const { clientId: client, location: place, result, followUp } = meeting;
  const field = (name, label, extra = {}) => (
    <FormField label={label} name={name} value={form[name]} onChange={handleChange} error={fieldErrors[name]} {...extra} />
  );

  return (
    <section className="meeting-visit">
      <PageHeader
        detail
        title={client?.name ?? 'Meeting'}
        subtitle={meeting.title}
        back={{ to: '/staff/meetings', label: 'My Meetings' }}
      >
        <MeetingStatus status={meeting.status} />
      </PageHeader>

      {meeting.status === 'CHECKED_IN' && (
        <Card size="small" className="meeting-visit__card meeting-visit__card--active">
          <p className="meeting-visit__headline">
            <CheckCircleFilled /> {justCheckedIn ? 'Visit Started Successfully' : 'Visit in progress'}
          </p>
          <dl className="meeting-visit__facts">
            <dt>Client</dt>
            <dd>{client?.name}</dd>
            <Punch label="Check-in" punch={meeting.checkIn} />
          </dl>
          {!showForm && (
            <Button className="meeting-visit__big" onClick={() => setShowForm(true)}>
              Check Out
            </Button>
          )}
        </Card>
      )}

      {meeting.status === 'COMPLETED' && (
        <Card size="small" className="meeting-visit__card" title="Visit Summary">
          <dl className="meeting-visit__facts">
            <Punch label="Check-in" punch={meeting.checkIn} />
            <Punch label="Check-out" punch={meeting.checkOut} />
            <dt>Duration</dt>
            <dd>{formatDuration(meeting.durationMinutes)}</dd>
            <dt>Outcome</dt>
            <dd>{OUTCOME_LABEL[result?.outcome]}</dd>
            {result?.estimatedDealValue != null && (
              <>
                <dt>Deal value</dt>
                <dd>{formatCurrency(result.estimatedDealValue)}</dd>
              </>
            )}
            {followUp?.at && (
              <>
                <dt>Follow-up</dt>
                <dd>
                  {formatDate(followUp.at)}, {formatTime(followUp.at)}
                  {followUp.notes && <span className="meeting-visit__muted"> · {followUp.notes}</span>}
                </dd>
              </>
            )}
            {result?.remarks && (
              <>
                <dt>Remarks</dt>
                <dd>{result.remarks}</dd>
              </>
            )}
          </dl>
        </Card>
      )}

      {/* Visit ke dauran: photo lena aur attachments. Poori hui visit mein sirf dekhna. */}
      {(meeting.status === 'CHECKED_IN' || meeting.status === 'COMPLETED') && (
        <div className="meeting-visit__card">
          <MeetingEvidence
            meeting={meeting}
            editable={meeting.status === 'CHECKED_IN'}
            required={Boolean(company?.requireVisitPhoto)}
            error={fieldErrors.visitPhoto}
            onChange={(next) => {
              setMeeting(next);
              setFieldErrors((prev) => ({ ...prev, visitPhoto: undefined }));
            }}
          />
        </div>
      )}

      {showForm && meeting.status === 'CHECKED_IN' && (
        <Card size="small" className="meeting-visit__card" title="Meeting Result">
          <form onSubmit={handleCheckOut} noValidate>
            <Alert>{error}</Alert>
            {field('outcome', 'Meeting outcome', { options: OUTCOME_OPTIONS, placeholder: 'Select an outcome', required: true })}
            {field('clientInterested', 'Client interested', { options: INTERESTED_OPTIONS })}
            {field('requirement', 'Requirement', { multiline: true, maxLength: 1000 })}
            {field('estimatedDealValue', 'Estimated deal value (₹)', { type: 'number', min: '0', inputMode: 'decimal' })}
            <div className="meeting-visit__pair">
              {field('followUpDate', 'Next follow-up date', {
                type: 'date',
                min: todayLocal(),
                required: form.outcome === 'FOLLOW_UP_REQUIRED',
              })}
              {field('followUpTime', 'Next follow-up time', { type: 'time' })}
            </div>
            {field('followUpNotes', 'Follow-up notes', { multiline: true, maxLength: 500 })}
            {field('remarks', 'Remarks', { multiline: true, maxLength: 1000 })}
            {field('clientFeedback', 'Client feedback', { multiline: true, maxLength: 1000 })}
            <p className="meeting-visit__muted">Your current location is recorded when you check out.</p>
            <div className="meeting-visit__actions">
              <Button variant="secondary" disabled={Boolean(busy)} onClick={() => setShowForm(false)}>
                Not Yet
              </Button>
              <Button type="submit" loading={Boolean(busy)}>
                {busy || 'Check Out & Complete'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isOpenMeeting(meeting) &&
        (meeting.date === todayLocal() ? (
          <Card size="small" className="meeting-visit__card">
            <p>When you reach the client, scan the meeting QR your admin sent to check in.</p>
            <Button className="meeting-visit__big" icon={<QrcodeOutlined />} onClick={() => navigate('/staff/scan')}>
              Scan Meeting QR
            </Button>
          </Card>
        ) : (
          <Alert type="info">You can check in on {formatDate(meeting.date)}, at the client location.</Alert>
        ))}

      {meeting.status === 'CANCELLED' && (
        <Alert>This meeting was cancelled.{meeting.cancelReason && ` Reason: ${meeting.cancelReason}`}</Alert>
      )}
      {meeting.status === 'MISSED' && <Alert>This meeting was missed. Ask your admin to schedule it again.</Alert>}

      <Card size="small" className="meeting-visit__card" title="Meeting">
        <dl className="meeting-visit__facts">
          <dt>When</dt>
          <dd>
            {formatDate(meeting.date)}, {formatTime(meeting.startAt)} - {formatTime(meeting.endAt)}
          </dd>
          <dt>Where</dt>
          <dd>
            {place.name}
            {place.address && <span className="meeting-visit__muted"> · {place.address}</span>}{' '}
            <a href={directionsUrl(place)} target="_blank" rel="noreferrer">
              Directions
            </a>
          </dd>
          {(meeting.contactPerson || meeting.contactPhone) && (
            <>
              <dt>Meet</dt>
              <dd>
                {meeting.contactPerson}
                {meeting.contactPhone && (
                  <>
                    {meeting.contactPerson && ' · '}
                    <a href={`tel:${meeting.contactPhone}`}>{meeting.contactPhone}</a>
                  </>
                )}
              </dd>
            </>
          )}
          {meeting.purpose && (
            <>
              <dt>Purpose</dt>
              <dd>{meeting.purpose}</dd>
            </>
          )}
          {meeting.notes && (
            <>
              <dt>Notes</dt>
              <dd>{meeting.notes}</dd>
            </>
          )}
        </dl>
      </Card>
    </section>
  );
}
