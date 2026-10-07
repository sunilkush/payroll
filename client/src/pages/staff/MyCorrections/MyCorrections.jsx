import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cancelCorrectionApi, listCorrectionsApi, requestCorrectionApi } from '../../../api/punchCorrectionApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import LeaveStatus from '../../../components/LeaveStatus/LeaveStatus.jsx';
import Modal from '../../../components/Modal/Modal.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import Table from '../../../components/Table/Table.jsx';
import { toFieldErrors } from '../../../utils/formErrors.js';
import { formatDate, formatTime, todayLocal } from '../../../utils/format.js';
import { useFeedback } from '../../../utils/useFeedback.js';
import './MyCorrections.css';

const COLUMNS = ['Date', 'Punch In', 'Punch Out', 'Reason', 'Status', 'Actions'];
const EMPTY_FORM = { date: '', punchIn: '', punchOut: '', reason: '' };

export default function MyCorrections() {
  // My Attendance se "?date=2026-10-05" ke saath aaye to form usi din ke liye khula milta hai.
  const [searchParams, setSearchParams] = useSearchParams();
  const presetDate = searchParams.get('date');

  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const { toast, confirm } = useFeedback();
  const [busyId, setBusyId] = useState(null);

  const [showForm, setShowForm] = useState(Boolean(presetDate));
  const [form, setForm] = useState({ ...EMPTY_FORM, date: presetDate ?? '' });
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await listCorrectionsApi({ page });
      setResult(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
    // toast ko deps mein nahi rakha: sirf page badalne par dobara laana hai.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setFormError('');
    setFieldErrors({});
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    setFieldErrors({});
    try {
      await requestCorrectionApi(form);
      closeForm();
      toast.success('Request sent. Your attendance will change once an admin approves it.');
      setPage(1);
      await load();
    } catch (err) {
      setFormError(err.message);
      setFieldErrors(toFieldErrors(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (correction) => {
    const ok = await confirm({
      title: 'Cancel this correction request?',
      content: `Your attendance for ${formatDate(correction.date)} will stay as it is.`,
      okText: 'Cancel request',
      cancelText: 'Keep it',
      danger: true,
    });
    if (!ok) return;
    setBusyId(correction._id);
    try {
      await cancelCorrectionApi(correction._id);
      toast.success('Request cancelled.');
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="my-corrections">
      <PageHeader title="Punch Corrections" subtitle="Forgot to punch? Ask your admin to fix the time.">
        <Button onClick={() => setShowForm(true)}>+ Request Correction</Button>
      </PageHeader>

      <Table columns={COLUMNS} loading={loading} empty='No requests yet. Use "Request Correction" if you forgot to punch.'>
        {result.items.map((correction) => (
          <tr key={correction._id}>
            <td>{formatDate(correction.date)}</td>
            <td>{correction.punchIn && formatTime(correction.punchIn)}</td>
            <td>{correction.punchOut && formatTime(correction.punchOut)}</td>
            <td>
              {correction.reason}
              {correction.actionNote && <p className="my-corrections__note">Admin: {correction.actionNote}</p>}
            </td>
            <td>
              <LeaveStatus status={correction.status} />
            </td>
            <td>
              {correction.status === 'PENDING' && (
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busyId === correction._id}
                  onClick={() => handleCancel(correction)}
                >
                  Cancel
                </Button>
              )}
            </td>
          </tr>
        ))}
      </Table>

      <Pagination page={page} totalPages={result.totalPages} onChange={setPage} />

      {showForm && (
        <Modal title="Request Punch Correction" onClose={closeForm}>
          <form onSubmit={handleSubmit} noValidate>
            <Alert>{formError}</Alert>
            <FormField
              label="Date"
              name="date"
              type="date"
              max={todayLocal()}
              value={form.date}
              onChange={handleChange}
              error={fieldErrors.date}
              required
            />
            <div className="my-corrections__times">
              <FormField
                label="Punch in time"
                name="punchIn"
                type="time"
                value={form.punchIn}
                onChange={handleChange}
                error={fieldErrors.punchIn}
              />
              <FormField
                label="Punch out time"
                name="punchOut"
                type="time"
                value={form.punchOut}
                onChange={handleChange}
                error={fieldErrors.punchOut}
              />
            </div>
            <p className="my-corrections__hint">
              Fill only the time that is missing or wrong. Leave the other one empty to keep it as it is.
            </p>
            <FormField
              label="Reason"
              name="reason"
              multiline
              maxLength={500}
              value={form.reason}
              onChange={handleChange}
              error={fieldErrors.reason}
              required
            />
            <div className="my-corrections__actions">
              <Button variant="secondary" onClick={closeForm}>
                Close
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
