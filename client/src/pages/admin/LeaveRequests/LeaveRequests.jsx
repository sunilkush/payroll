import { useCallback, useEffect, useState } from 'react';
import { Select } from 'antd';
import { approveLeaveApi, listLeavesApi, rejectLeaveApi } from '../../../api/leaveApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import LeaveStatus, { LEAVE_STATUS_OPTIONS } from '../../../components/LeaveStatus/LeaveStatus.jsx';
import Modal from '../../../components/Modal/Modal.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import Table from '../../../components/Table/Table.jsx';
import { formatDate } from '../../../utils/format.js';
import './LeaveRequests.css';

const COLUMNS = ['Staff', 'Type', 'Dates', 'Days', 'Reason', 'Status', 'Actions'];

export default function LeaveRequests() {
  const [query, setQuery] = useState({ status: 'PENDING', page: 1 });
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: 'success', text: '' });
  const [busy, setBusy] = useState(false);

  // Reject se pehle reason poochne wala modal
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listLeavesApi(query);
      setResult(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
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

  const run = async (action, successText) => {
    setBusy(true);
    try {
      await action();
      setMessage({ type: 'success', text: successText });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
      await load();
    }
  };

  const handleApprove = (leave) => {
    const name = leave.userId?.name ?? 'Staff';
    if (!window.confirm(`${name} ki ${leave.days} din ki ${leave.type} approve karni hai?`)) return;
    run(() => approveLeaveApi(leave._id), 'Leave approve ho gayi.');
  };

  const handleReject = async (event) => {
    event.preventDefault();
    const leave = rejecting;
    closeReject();
    await run(() => rejectLeaveApi(leave._id, note), 'Leave reject ho gayi. Staff ka balance wapas ho gaya.');
  };

  return (
    <section className="leave-requests">
      <PageHeader title="Leave Requests" subtitle={`${result.total} requests`}>
        <Select
          className="leave-requests__filter"
          aria-label="Status filter"
          options={LEAVE_STATUS_OPTIONS}
          value={query.status}
          onChange={(status) => setQuery({ status, page: 1 })}
        />
      </PageHeader>

      <Alert type={message.type}>{message.text}</Alert>

      <Table columns={COLUMNS} empty={loading ? 'Loading...' : 'Koi leave request nahi hai.'}>
        {result.items.map((leave) => (
          <tr key={leave._id}>
            <td>
              <span className="leave-requests__name">{leave.userId?.name ?? '-'}</span>
              <p className="leave-requests__muted">{leave.userId?.employeeCode}</p>
            </td>
            <td>{leave.type}</td>
            <td>
              {formatDate(leave.fromDate)}
              {leave.toDate !== leave.fromDate && ` - ${formatDate(leave.toDate)}`}
            </td>
            <td>{leave.days}</td>
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
                  <Button size="sm" disabled={busy} onClick={() => handleApprove(leave)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="danger" disabled={busy} onClick={() => setRejecting(leave)}>
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
        <Modal title={`Reject Leave: ${rejecting.userId?.name ?? ''}`} onClose={closeReject}>
          <form onSubmit={handleReject}>
            <FormField
              label="Reason (staff ko dikhega)"
              name="note"
              multiline
              maxLength={300}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              autoFocus
            />
            <div className="leave-requests__modal-actions">
              <Button variant="secondary" onClick={closeReject}>
                Close
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
