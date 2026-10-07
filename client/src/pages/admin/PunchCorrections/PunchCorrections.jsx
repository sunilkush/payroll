import { useCallback, useEffect, useState } from 'react';
import {
  approveCorrectionApi,
  listCorrectionsApi,
  rejectCorrectionApi,
} from '../../../api/punchCorrectionApi.js';
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
import { formatDate, formatTime } from '../../../utils/format.js';
import { useFeedback } from '../../../utils/useFeedback.js';
import './PunchCorrections.css';

const COLUMNS = ['Staff', 'Date', 'Punch In', 'Punch Out', 'Reason', 'Status', 'Actions'];
const STATUS_TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'all', label: 'All' },
];
const EMPTY_TEXT = {
  PENDING: 'No pending requests. You are all caught up.',
  all: 'No punch correction requests yet.',
};

// Maanga hua time, aur neeche attendance mein request ke waqt jo time tha. Jo punch staff ne
// nahi chheda uske liye sirf purana time dikhta hai.
// (Component nahi, function: khali ho to Table mobile card mein ye cell dikhata hi nahi.)
function punchTime(requested, recorded) {
  if (!requested) return recorded ? <span className="punch-corrections__muted">{formatTime(recorded)} (no change)</span> : null;
  return (
    <>
      <strong>{formatTime(requested)}</strong>
      <span className="punch-corrections__was">{recorded ? `was ${formatTime(recorded)}` : 'was not punched'}</span>
    </>
  );
}

const summary = (correction) =>
  [
    correction.punchIn && `punch in ${formatTime(correction.punchIn)}`,
    correction.punchOut && `punch out ${formatTime(correction.punchOut)}`,
  ]
    .filter(Boolean)
    .join(', ');

export default function PunchCorrections() {
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
      const res = await listCorrectionsApi(query);
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

  const run = async (correction, action, successText) => {
    setBusyId(correction._id);
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

  const handleApprove = async (correction) => {
    const name = correction.userId?.name ?? 'this staff member';
    const ok = await confirm({
      title: `Approve correction for ${name}?`,
      content: `${formatDate(correction.date)}: ${summary(correction)}. The attendance for this day will be updated.`,
      okText: 'Approve',
    });
    if (ok) run(correction, () => approveCorrectionApi(correction._id), `Attendance updated for ${name}.`);
  };

  const handleReject = async (event) => {
    event.preventDefault();
    const correction = rejecting;
    closeReject();
    await run(correction, () => rejectCorrectionApi(correction._id, note), 'Request rejected. Attendance was not changed.');
  };

  return (
    <section className="punch-corrections">
      <PageHeader title="Punch Corrections" subtitle="Approve or reject time corrections from staff who forgot to punch" />

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
        {result.items.map((correction) => (
          <tr key={correction._id}>
            <td>
              <UserCell name={correction.userId?.name ?? 'Unknown'} sub={correction.userId?.employeeCode} />
            </td>
            <td>{formatDate(correction.date)}</td>
            <td>{punchTime(correction.punchIn, correction.recorded?.punchIn)}</td>
            <td>{punchTime(correction.punchOut, correction.recorded?.punchOut)}</td>
            <td>
              {correction.reason}
              {correction.actionNote && <p className="punch-corrections__muted">Note: {correction.actionNote}</p>}
            </td>
            <td>
              <LeaveStatus status={correction.status} />
            </td>
            <td>
              {correction.status === 'PENDING' && (
                <div className="punch-corrections__actions">
                  <Button size="sm" loading={busyId === correction._id} onClick={() => handleApprove(correction)}>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyId === correction._id}
                    onClick={() => setRejecting(correction)}
                  >
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
        <Modal title={`Reject correction: ${rejecting.userId?.name ?? ''}`} onClose={closeReject}>
          <form onSubmit={handleReject}>
            <p className="punch-corrections__lead">
              {formatDate(rejecting.date)}: {summary(rejecting)}. The attendance for this day stays as it is.
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
            <div className="punch-corrections__modal-actions">
              <Button variant="secondary" onClick={closeReject}>
                Cancel
              </Button>
              <Button type="submit" variant="danger">
                Reject Request
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
