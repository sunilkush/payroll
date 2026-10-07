import { useEffect, useState } from 'react';
import { QrcodeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { listMeetingsApi } from '../../../api/meetingApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import ListToolbar from '../../../components/ListToolbar/ListToolbar.jsx';
import MeetingStatus, { isOpenMeeting } from '../../../components/MeetingStatus/MeetingStatus.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import Table from '../../../components/Table/Table.jsx';
import UserCell from '../../../components/UserCell/UserCell.jsx';
import { formatDate, formatTime, todayLocal } from '../../../utils/format.js';
import './MyMeetings.css';

const COLUMNS = ['Client', 'When', 'Where', 'Contact', 'Status', 'Actions'];
const TABS = [
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];
const EMPTY_TEXT = {
  today: 'No meetings today.',
  upcoming: 'No upcoming meetings.',
  past: 'No past meetings.',
};

const shift = (date, days) => dayjs(date).add(days, 'day').format('YYYY-MM-DD');

// Tab -> date range. Aaj aur aane wali meetings pehle wali pehle; purani mein nayi pehle.
const rangeFor = (tab, today) =>
  ({
    today: { from: today, to: today },
    upcoming: { from: shift(today, 1) },
    past: { to: shift(today, -1) },
  })[tab];

const directionsUrl = ({ lat, lng }) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

// Sales manager: apni meetings. Aaj ki khuli meeting par "Scan QR" se check-in shuru hota hai.
export default function MyMeetings() {
  const navigate = useNavigate();
  const today = todayLocal();

  const [query, setQuery] = useState({ tab: 'today', page: 1 });
  const [result, setResult] = useState({ items: [], totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    listMeetingsApi({ ...rangeFor(query.tab, today), page: query.page, limit: 20 })
      .then((res) => {
        if (ignore) return;
        // Server nayi pehle deta hai; aaj / aane wali ke liye ulta (jo pehle hai wo upar).
        const items = query.tab === 'past' ? res.data.items : [...res.data.items].reverse();
        setResult({ ...res.data, items });
        setError('');
      })
      .catch((err) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [query, today]);

  return (
    <section className="my-meetings">
      <PageHeader title="My Meetings" subtitle="Client meetings assigned to you">
        <Button icon={<QrcodeOutlined />} onClick={() => navigate('/staff/scan')}>
          Scan Meeting QR
        </Button>
      </PageHeader>

      <ListToolbar tabs={TABS} value={query.tab} onChange={(tab) => setQuery({ tab, page: 1 })} />

      <Alert>{error}</Alert>

      <Table columns={COLUMNS} primary={0} loading={loading} empty={EMPTY_TEXT[query.tab]}>
        {result.items.map((meeting) => (
          <tr key={meeting._id}>
            <td>
              <UserCell square name={meeting.clientId?.name ?? 'Client'} sub={meeting.title} to={`/staff/meetings/${meeting._id}`} />
            </td>
            <td>
              {query.tab !== 'today' && `${formatDate(meeting.date)}, `}
              {formatTime(meeting.startAt)} - {formatTime(meeting.endAt)}
            </td>
            <td>
              {meeting.location.name}
              {meeting.location.address && <span className="my-meetings__muted"> · {meeting.location.address}</span>}{' '}
              <a href={directionsUrl(meeting.location)} target="_blank" rel="noreferrer">
                Directions
              </a>
            </td>
            <td>
              {meeting.contactPerson}
              {meeting.contactPhone && (
                <>
                  {meeting.contactPerson && ' · '}
                  <a href={`tel:${meeting.contactPhone}`}>{meeting.contactPhone}</a>
                </>
              )}
            </td>
            <td>
              <MeetingStatus status={meeting.status} />
              {meeting.status === 'CANCELLED' && meeting.cancelReason && (
                <span className="my-meetings__muted"> {meeting.cancelReason}</span>
              )}
            </td>
            <td>
              <div className="my-meetings__actions">
                {meeting.date === today && isOpenMeeting(meeting) && (
                  <Button size="sm" icon={<QrcodeOutlined />} onClick={() => navigate('/staff/scan')}>
                    Scan QR
                  </Button>
                )}
                {meeting.status === 'CHECKED_IN' ? (
                  <Button size="sm" onClick={() => navigate(`/staff/meetings/${meeting._id}`)}>
                    Check Out
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/staff/meetings/${meeting._id}`)}>
                    View
                  </Button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <Pagination
        page={query.page}
        totalPages={result.totalPages}
        onChange={(page) => setQuery((prev) => ({ ...prev, page }))}
      />
    </section>
  );
}
