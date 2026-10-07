import { useEffect, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { listClientsApi } from '../../../api/clientApi.js';
import { listMeetingsApi } from '../../../api/meetingApi.js';
import { listStaffApi } from '../../../api/staffApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import ListToolbar from '../../../components/ListToolbar/ListToolbar.jsx';
import MeetingStatus, {
  formatDuration,
  LocationStatus,
  MEETING_STATUS_TABS,
  OUTCOME_LABEL,
} from '../../../components/MeetingStatus/MeetingStatus.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import Table from '../../../components/Table/Table.jsx';
import UserCell from '../../../components/UserCell/UserCell.jsx';
import { formatDate, formatTime } from '../../../utils/format.js';
import { useFeedback } from '../../../utils/useFeedback.js';
import './Meetings.css';

const COLUMNS = [
  'Client',
  'Sales Manager',
  'Date',
  'Time',
  'Status',
  'Check-in',
  'Check-out',
  'Duration',
  'Location',
  'Outcome',
  'Follow-up',
  'Actions',
];
const OUTCOME_OPTIONS = [
  { value: '', label: 'All outcomes' },
  ...Object.entries(OUTCOME_LABEL).map(([value, label]) => ({ value, label })),
];
const EMPTY_QUERY = { search: '', status: 'all', from: '', to: '', salesManagerId: '', clientId: '', outcome: '', page: 1 };

// Khali filters server ko nahi bhejte.
const toParams = (query) => Object.fromEntries(Object.entries(query).filter(([, value]) => value !== ''));

export default function Meetings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useFeedback();

  const [query, setQuery] = useState(EMPTY_QUERY);
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Filter dropdowns ke options
  const [clients, setClients] = useState([]);
  const [managers, setManagers] = useState([]);

  // MeetingForm / MeetingDetail yahan message bhejte hain: ek baar toast dikha kar hata do.
  useEffect(() => {
    if (!location.state?.message) return;
    toast.success(location.state.message);
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate, toast]);

  useEffect(() => {
    // Filters ke bina bhi list chalti hai, isliye yahan ki galti chup-chaap chhod dete hain.
    listClientsApi({ limit: 100 })
      .then((res) => setClients(res.data.items.map((client) => ({ value: client._id, label: client.name }))))
      .catch(() => {});
    listStaffApi({ salesManager: true, limit: 100 })
      .then((res) => setManagers(res.data.items.map((staff) => ({ value: staff._id, label: staff.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    listMeetingsApi(toParams(query))
      .then((res) => {
        if (ignore) return;
        setResult(res.data);
        setError('');
      })
      .catch((err) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [query]);

  const setFilter = (event) => setQuery((prev) => ({ ...prev, [event.target.name]: event.target.value, page: 1 }));
  const filtering = Object.entries(query).some(([key, value]) => key !== 'page' && value !== EMPTY_QUERY[key]);

  const addButton = (
    <Button icon={<PlusOutlined />} onClick={() => navigate('/admin/meetings/new')}>
      Create Meeting
    </Button>
  );
  const empty = filtering ? (
    'No meetings match these filters.'
  ) : (
    <div className="meetings__empty">
      <p>No meetings yet. Create a meeting and assign it to a sales manager.</p>
      {addButton}
    </div>
  );

  return (
    <section className="meetings">
      <PageHeader title="Meetings" subtitle="Client meetings assigned to your sales managers">
        {addButton}
      </PageHeader>

      <ListToolbar
        searchPlaceholder="Search by client, sales manager or title"
        onSearch={(search) => setQuery((prev) => (prev.search === search ? prev : { ...prev, search, page: 1 }))}
        tabs={MEETING_STATUS_TABS}
        counts={result.counts}
        value={query.status}
        onChange={(status) => setQuery((prev) => ({ ...prev, status, page: 1 }))}
      />

      <div className="meetings__filters">
        <FormField label="From" name="from" type="date" max={query.to || undefined} value={query.from} onChange={setFilter} />
        <FormField label="To" name="to" type="date" min={query.from || undefined} value={query.to} onChange={setFilter} />
        <FormField
          label="Sales manager"
          name="salesManagerId"
          searchable
          options={[{ value: '', label: 'All sales managers' }, ...managers]}
          value={query.salesManagerId}
          onChange={setFilter}
        />
        <FormField
          label="Client"
          name="clientId"
          searchable
          options={[{ value: '', label: 'All clients' }, ...clients]}
          value={query.clientId}
          onChange={setFilter}
        />
        <FormField label="Outcome" name="outcome" options={OUTCOME_OPTIONS} value={query.outcome} onChange={setFilter} />
      </div>

      <Alert>{error}</Alert>

      <Table columns={COLUMNS} primary={0} loading={loading} empty={empty}>
        {result.items.map((meeting) => (
          <tr key={meeting._id}>
            <td>
              <UserCell
                square
                name={meeting.clientId?.name ?? 'Unknown client'}
                sub={meeting.title}
                to={`/admin/meetings/${meeting._id}`}
              />
            </td>
            <td>{meeting.salesManagerId?.name ?? 'Unknown'}</td>
            <td>{formatDate(meeting.date)}</td>
            <td>
              {formatTime(meeting.startAt)} - {formatTime(meeting.endAt)}
            </td>
            <td>
              <MeetingStatus status={meeting.status} />
            </td>
            <td>{meeting.checkIn && formatTime(meeting.checkIn.at)}</td>
            <td>{meeting.checkOut && formatTime(meeting.checkOut.at)}</td>
            <td>{formatDuration(meeting.durationMinutes)}</td>
            <td>{meeting.checkIn && <LocationStatus status={meeting.checkIn.locationStatus} />}</td>
            <td>{OUTCOME_LABEL[meeting.result?.outcome]}</td>
            <td>{meeting.followUp?.at && formatDate(meeting.followUp.at)}</td>
            <td>
              <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/meetings/${meeting._id}`)}>
                View
              </Button>
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
