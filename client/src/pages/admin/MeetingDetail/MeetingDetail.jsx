import { useCallback, useEffect, useState } from 'react';
import { Card, Descriptions, Timeline } from 'antd';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { cancelMeetingApi, getMeetingApi } from '../../../api/meetingApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import Loader from '../../../components/Loader/Loader.jsx';
import MeetingStatus, {
  EVENT_LABEL,
  formatDuration,
  isOpenMeeting,
  LocationStatus,
  OUTCOME_LABEL,
} from '../../../components/MeetingStatus/MeetingStatus.jsx';
import MeetingQr from '../../../components/MeetingQr/MeetingQr.jsx';
import Modal from '../../../components/Modal/Modal.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import { formatCurrency, formatDate, formatTime } from '../../../utils/format.js';
import { useFeedback } from '../../../utils/useFeedback.js';
import './MeetingDetail.css';

const dateTime = (value) => `${formatDate(value)}, ${formatTime(value)}`;

// Descriptions ke liye: khali value wali lines hata deta hai.
const rows = (items) =>
  items
    .filter(([, value]) => value !== undefined && value !== null && value !== '' && value !== false)
    .map(([label, value]) => ({ key: label, label, children: value }));

// Check-in / check-out ka ek record
const punchRows = (label, punch) =>
  punch
    ? [
        [`${label} time`, dateTime(punch.at)],
        [`${label} location`, <LocationStatus key="status" status={punch.locationStatus} />],
        [`${label} distance`, `${punch.distance} m from the meeting location`],
        [`${label} GPS accuracy`, punch.accuracy == null ? '' : `${Math.round(punch.accuracy)} m`],
      ]
    : [];

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useFeedback();

  const [meeting, setMeeting] = useState(null);
  const [error, setError] = useState('');
  // Cancel se pehle wajah poochne wala modal
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  // MeetingForm save ke baad yahan message bhejta hai: ek baar toast dikha kar hata do.
  useEffect(() => {
    if (!location.state?.message) return;
    toast.success(location.state.message);
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate, toast]);

  useEffect(() => {
    let ignore = false;
    getMeetingApi(id)
      .then((res) => !ignore && setMeeting(res.data.meeting))
      .catch((err) => !ignore && setError(err.message));
    return () => {
      ignore = true;
    };
  }, [id]);

  const closeCancel = useCallback(() => {
    setCancelling(false);
    setReason('');
  }, []);

  const handleCancel = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await cancelMeetingApi(id, reason);
      setMeeting(res.data.meeting);
      closeCancel();
      toast.success('Meeting cancelled.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Alert>{error}</Alert>;
  if (!meeting) return <Loader />;

  const { clientId: client, salesManagerId: manager, location: place, result, followUp } = meeting;
  const open = isOpenMeeting(meeting);
  const mapUrl = `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=17/${place.lat}/${place.lng}`;

  const sections = [
    {
      title: 'Meeting Information',
      items: rows([
        ['Client', client?.name],
        ['Contact person', meeting.contactPerson],
        ['Client phone', meeting.contactPhone],
        ['Sales manager', manager && `${manager.name} (${manager.employeeCode})`],
        ['Title', meeting.title],
        ['Purpose', meeting.purpose],
        ['Date', formatDate(meeting.date)],
        ['Scheduled time', `${formatTime(meeting.startAt)} - ${formatTime(meeting.endAt)}`],
        ['Notes', meeting.notes],
        ['Cancel reason', meeting.status === 'CANCELLED' && (meeting.cancelReason || 'No reason given')],
      ]),
    },
    {
      title: 'Location',
      items: rows([
        ['Meeting location', place.name],
        ['Address', place.address],
        ['Geofence radius', `${place.radius} m`],
        [
          'Coordinates',
          <a key="map" href={mapUrl} target="_blank" rel="noreferrer">
            {place.lat}, {place.lng}
          </a>,
        ],
      ]),
    },
    {
      title: 'Visit Information',
      empty: 'The sales manager has not checked in yet.',
      items: rows([
        ...punchRows('Check-in', meeting.checkIn),
        ...punchRows('Check-out', meeting.checkOut),
        ['Duration', formatDuration(meeting.durationMinutes)],
      ]),
    },
    {
      title: 'Meeting Result',
      empty: 'The result is added when the sales manager completes the meeting.',
      items: rows([
        ['Outcome', OUTCOME_LABEL[result?.outcome]],
        ['Client interested', result?.clientInterested == null ? '' : result.clientInterested ? 'Yes' : 'No'],
        ['Requirement', result?.requirement],
        ['Estimated deal value', result?.estimatedDealValue == null ? '' : formatCurrency(result.estimatedDealValue)],
        ['Remarks', result?.remarks],
        ['Client feedback', result?.clientFeedback],
        ['Next follow-up', followUp?.at && dateTime(followUp.at)],
        ['Follow-up notes', followUp?.notes],
      ]),
    },
  ];

  return (
    <section className="meeting-detail">
      <PageHeader
        detail
        title={client?.name ?? 'Meeting'}
        subtitle={meeting.title}
        back={{ to: '/admin/meetings', label: 'Meetings' }}
      >
        <MeetingStatus status={meeting.status} />
        {open && (
          <>
            <Button variant="secondary" onClick={() => navigate(`/admin/meetings/${id}/edit`)}>
              Edit
            </Button>
            <Button variant="danger" onClick={() => setCancelling(true)}>
              Cancel Meeting
            </Button>
          </>
        )}
      </PageHeader>

      {open && <MeetingQr meeting={meeting} onChange={setMeeting} />}

      {sections.map((section) => (
        <Card key={section.title} className="meeting-detail__section" size="small" title={section.title}>
          {section.items.length ? (
            <Descriptions size="small" column={{ xs: 1, md: 2 }} items={section.items} />
          ) : (
            <p className="meeting-detail__muted">{section.empty}</p>
          )}
        </Card>
      ))}

      <Card className="meeting-detail__section" size="small" title="Audit History">
        <Timeline
          items={meeting.events.map((event, index) => ({
            key: index,
            content: (
              <>
                <strong>{EVENT_LABEL[event.type] ?? event.type}</strong>
                <span className="meeting-detail__muted">
                  {' '}
                  · {dateTime(event.at)}
                  {event.by?.name && ` · ${event.by.name}`}
                </span>
                {event.detail && <p className="meeting-detail__muted">{event.detail}</p>}
              </>
            ),
          }))}
        />
      </Card>

      {cancelling && (
        <Modal title="Cancel this meeting?" onClose={closeCancel}>
          <form onSubmit={handleCancel}>
            <p className="meeting-detail__muted">
              {client?.name}, {formatDate(meeting.date)} at {formatTime(meeting.startAt)}. The sales manager will no
              longer be able to check in. This cannot be undone.
            </p>
            <FormField
              label="Reason (visible to the sales manager)"
              name="reason"
              multiline
              maxLength={300}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              autoFocus
            />
            <div className="meeting-detail__modal-actions">
              <Button variant="secondary" onClick={closeCancel}>
                Keep Meeting
              </Button>
              <Button type="submit" variant="danger" loading={busy}>
                Cancel Meeting
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
