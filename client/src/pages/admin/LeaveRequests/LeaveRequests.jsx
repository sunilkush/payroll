import { useCallback, useEffect, useState } from 'react';
import { Tag } from 'antd';
import { approveLeaveApi, listLeavesApi, rejectLeaveApi } from '../../../api/leaveApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import LeaveStatus from '../../../components/LeaveStatus/LeaveStatus.jsx';
import ListToolbar from '../../../components/ListToolbar/ListToolbar.jsx';
import Modal from '../../../components/Modal/Modal.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import Table from '../../../components/Table/Table.jsx';
import UserCell from '../../../components/UserCell/UserCell.jsx';
import { formatDate } from '../../../utils/format.js';
import { useFeedback } from '../../../utils/useFeedback.js';
import './LeaveRequests.css';

const COLUMNS = ['Staff', 'Leave', 'Dates', 'Reason', 'Status', 'Actions'];
const STATUS_TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'all', label: 'All' },
];
const EMPTY_TEXT = {
  PENDING: 'No pending requests. You are all caught up.',
  all: 'No leave requests yet.',
};

export default function LeaveRequests() {
  const { toast, confirm } = useFeedback();

  const [query, setQuery] = useState({ status: 'PENDING', page: 1 });
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  // Reject se pehle reason poochne wala modal
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listLeavesApi(query);
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

  const closeReject = useCallback(() => {
    setRejecting(null);
    setNote('');
  }, []);

  const run = async (leave, action, successText) => {
    setBusyId(leave._id);
    try {
      await action();
      toast.success(successText);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
      await load();
    }
  };

  const handleApprove = async (leave) => {
    const name = leave.userId?.name ?? 'this staff member';
    const ok = await confirm({
      title: `Approve leave for ${name}?`,
      content: `${leave.days} day(s) of ${leave.type}, ${formatDate(leave.fromDate)}${
        leave.toDate !== leave.fromDate ? ` to ${formatDate(leave.toDate)}` : ''
      }. Approved leave is paid and cannot be undone here.`,
      okText: 'Approve',
    });
    if (ok) run(leave, () => approveLeaveApi(leave._id), `Leave approved for ${name}.`);
  };

  const handleReject = async (event) => {
    event.preventDefault();
    const leave = rejecting;
    closeReject();
    await run(leave, () => rejectLeaveApi(leave._id, note), 'Leave rejected. The balance has been returned.');
  };

  return (
    <section className="leave-requests">
      <PageHeader title="Leave Requests" subtitle="Approve or reject CL / EL requests from staff" />

      <ListToolbar
        tabs={STATUS_TABS}
        counts={result.counts}
        value={query.status}
        onChange={(status) => setQuery({ status, page: 1 })}
      />

      <Alert>{error}</Alert>

      <Table
        columns={COLUMNS}
        primary={0}
        loading={loading}
        empty={EMPTY_TEXT[query.status] ?? 'No requests with this status.'}
      >
        {result.items.map((leave) => (
          <tr key={leave._id}>
            <td>
              <UserCell name={leave.userId?.name ?? 'Unknown'} sub={leave.userId?.employeeCode} />
            </td>
            <td>
              <Tag color="blue">{leave.type}</Tag>
              {leave.days} day(s)
            </td>
            <td>
              {formatDate(leave.fromDate)}
              {leave.toDate !== leave.fromDate && ` - ${formatDate(leave.toDate)}`}
            </td>
            <td>
              {leave.reason}
              {leave.actionNote && <p className="leave-requests__muted">Note: {leave.actionNote}</p>}
            </td>
            <td>
              <LeaveStatus status={leave.status} />
            </td>
            <td>
              {leave.status === 'PENDING' && (
                <div className="leave-requests__actions">
                  <Button size="sm" loading={busyId === leave._id} onClick={() => handleApprove(leave)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="danger" disabled={busyId === leave._id} onClick={() => setRejecting(leave)}>
                    Reject
                  </Button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </Table>

      <Pagination
        page={query.page}
        totalPages={result.totalPages}
        onChange={(page) => setQuery((prev) => ({ ...prev, page }))}
      />

      {rejecting && (
        <Modal title={`Reject leave: ${rejecting.userId?.name ?? ''}`} onClose={closeReject}>
          <form onSubmit={handleReject}>
            <p className="leave-requests__muted">
              {rejecting.days} day(s) of {rejecting.type}. The blocked balance goes back to the staff member.
            </p>
            <FormField
              label="Reason (visible to the staff member)"
              name="note"
              multiline
              maxLength={300}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              autoFocus
            />
            <div className="leave-requests__modal-actions">
              <Button variant="secondary" onClick={closeReject}>
                Cancel
              </Button>
              <Button type="submit" variant="danger">
                Reject Leave
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
