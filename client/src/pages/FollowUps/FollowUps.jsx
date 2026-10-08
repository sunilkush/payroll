import { useCallback, useEffect, useState } from 'react';
import { Tag } from 'antd';
import { closeFollowUpApi, listFollowUpsApi } from '../../api/meetingApi.js';
import Alert from '../../components/Alert/Alert.jsx';
import Badge from '../../components/Badge/Badge.jsx';
import Button from '../../components/Button/Button.jsx';
import ListToolbar from '../../components/ListToolbar/ListToolbar.jsx';
import { OUTCOME_LABEL } from '../../components/MeetingStatus/MeetingStatus.jsx';
import PageHeader from '../../components/PageHeader/PageHeader.jsx';
import Pagination from '../../components/Pagination/Pagination.jsx';
import Table from '../../components/Table/Table.jsx';
import UserCell from '../../components/UserCell/UserCell.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDate, formatTime } from '../../utils/format.js';
import { ROLES } from '../../utils/roles.js';
import { useFeedback } from '../../utils/useFeedback.js';
import './FollowUps.css';

const TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'DONE', label: 'Done' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'all', label: 'All' },
];
const STATUS = {
  PENDING: { label: 'Pending', tone: 'warning' },
  DONE: { label: 'Done', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'muted' },
};
const EMPTY_TEXT = {
  PENDING: 'No pending follow-ups. You are all caught up.',
  all: 'No follow-ups yet. They are created when a meeting is completed with a follow-up date.',
};

// Meeting ke baad ke follow-ups. Sales manager ko apne, admin ko company ke saare (sales manager ke naam ke saath).
// Meeting poori karte waqt follow-up date bharne se yahan aate hain.
export default function FollowUps() {
  const { user } = useAuth();
  const isAdmin = user.role === ROLES.ADMIN;
  const { toast, confirm } = useFeedback();

  const [query, setQuery] = useState({ status: 'PENDING', page: 1 });
  const [result, setResult] = useState({ items: [], totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listFollowUpsApi(query);
      setResult(res.data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const close = async (meeting, status) => {
    const client = meeting.clientId?.name ?? 'this client';
    const ok = await confirm(
      status === 'DONE'
        ? { title: `Mark the follow-up with ${client} as done?`, okText: 'Mark Done' }
        : { title: `Cancel the follow-up with ${client}?`, content: 'Use this when a follow-up is no longer needed.', okText: 'Cancel Follow-up', cancelText: 'Keep it', danger: true }
    );
    if (!ok) return;
    setBusyId(meeting._id);
    try {
      await closeFollowUpApi(meeting._id, status);
      toast.success(status === 'DONE' ? 'Follow-up marked as done.' : 'Follow-up cancelled.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
      await load();
    }
  };

  const columns = ['Client', ...(isAdmin ? ['Sales Manager'] : []), 'Due', 'Notes', 'Meeting', 'Status', 'Actions'];
  const now = new Date();

  return (
    <section className="follow-ups">
      <PageHeader
        title="Follow-ups"
        subtitle={isAdmin ? 'Next steps your sales managers promised after client meetings' : 'Clients you need to get back to'}
      />

      <ListToolbar tabs={TABS} counts={result.counts} value={query.status} onChange={(status) => setQuery({ status, page: 1 })} />

      <Alert>{error}</Alert>

      <Table columns={columns} primary={0} loading={loading} empty={EMPTY_TEXT[query.status] ?? 'No follow-ups with this status.'}>
        {result.items.map((meeting) => {
          const { followUp } = meeting;
          const overdue = followUp.status === 'PENDING' && new Date(followUp.at) < now;
          return (
            <tr key={meeting._id}>
              <td>
                <UserCell
                  square
                  name={meeting.clientId?.name ?? 'Client'}
                  sub={[meeting.contactPerson, meeting.contactPhone].filter(Boolean).join(' · ')}
                />
              </td>
              {isAdmin && <td>{meeting.salesManagerId?.name ?? 'Unknown'}</td>}
              <td>
                {formatDate(followUp.at)}, {formatTime(followUp.at)}
                {overdue && (
                  <Tag color="error" className="follow-ups__overdue">
                    Overdue
                  </Tag>
                )}
              </td>
              <td>{followUp.notes}</td>
              <td>
                {formatDate(meeting.date)}
                <span className="follow-ups__muted"> · {OUTCOME_LABEL[meeting.result?.outcome]}</span>
              </td>
              <td>
                <Badge tone={STATUS[followUp.status]?.tone}>{STATUS[followUp.status]?.label ?? followUp.status}</Badge>
              </td>
              <td>
                {followUp.status === 'PENDING' && (
                  <div className="follow-ups__actions">
                    <Button size="sm" loading={busyId === meeting._id} onClick={() => close(meeting, 'DONE')}>
                      Mark Done
                    </Button>
                    <Button size="sm" variant="danger" disabled={busyId === meeting._id} onClick={() => close(meeting, 'CANCELLED')}>
                      Cancel
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </Table>

      <Pagination page={query.page} totalPages={result.totalPages} onChange={(page) => setQuery((prev) => ({ ...prev, page }))} />
    </section>
  );
}
