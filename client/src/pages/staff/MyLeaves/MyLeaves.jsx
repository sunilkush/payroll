import { useCallback, useEffect, useState } from 'react';
import { applyLeaveApi, cancelLeaveApi, getLeaveBalanceApi, listLeavesApi } from '../../../api/leaveApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import LeaveStatus, { LEAVE_TYPE_LABEL } from '../../../components/LeaveStatus/LeaveStatus.jsx';
import Modal from '../../../components/Modal/Modal.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import Pagination from '../../../components/Pagination/Pagination.jsx';
import Table from '../../../components/Table/Table.jsx';
import { toFieldErrors } from '../../../utils/formErrors.js';
import { formatDate } from '../../../utils/format.js';
import './MyLeaves.css';

const COLUMNS = ['Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Actions'];
const TYPE_OPTIONS = Object.entries(LEAVE_TYPE_LABEL).map(([value, label]) => ({ value, label }));
const EMPTY_FORM = { type: 'CL', fromDate: '', toDate: '', reason: '' };

export default function MyLeaves() {
  const [balance, setBalance] = useState(null);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: 'success', text: '' });
  const [busyId, setBusyId] = useState(null);

  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [balanceRes, listRes] = await Promise.all([getLeaveBalanceApi(), listLeavesApi({ page })]);
      setBalance(balanceRes.data.balance);
      setResult(listRes.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const closeApply = useCallback(() => {
    setShowApply(false);
    setForm(EMPTY_FORM);
    setFormError('');
    setFieldErrors({});
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // From date chunte hi To date bhi wahi ho jaye (ek din ki leave sabse aam hai).
      if (name === 'fromDate' && (!prev.toDate || prev.toDate < value)) next.toDate = value;
      return next;
    });
  };

  const handleApply = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    setFieldErrors({});
    try {
      const res = await applyLeaveApi(form);
      closeApply();
      setMessage({
        type: 'success',
        text: `${res.data.leave.days} din ki ${form.type} apply ho gayi. Admin ke approve karne tak balance block rahega.`,
      });
      setPage(1);
      await load();
    } catch (err) {
      setFormError(err.message);
      setFieldErrors(toFieldErrors(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (leave) => {
    if (!window.confirm('Ye leave request cancel karni hai? Balance wapas mil jayega.')) return;
    setBusyId(leave._id);
    try {
      await cancelLeaveApi(leave._id);
      setMessage({ type: 'success', text: 'Leave cancel ho gayi.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="my-leaves">
      <PageHeader title="My Leaves" subtitle={balance ? `Year ${balance.year}` : undefined}>
        <Button disabled={!balance} onClick={() => setShowApply(true)}>
          + Apply Leave
        </Button>
      </PageHeader>

      <Alert type={message.type}>{message.text}</Alert>

      {balance && (
        <div className="my-leaves__balances">
          {['CL', 'EL'].map((type) => (
            <article key={type} className="my-leaves__balance">
              <h2 className="my-leaves__balance-title">{LEAVE_TYPE_LABEL[type]}</h2>
              <p className="my-leaves__available">
                {balance[type].available}
                <span> available</span>
              </p>
              <p className="my-leaves__breakup">
                <span>Pending (blocked): {balance[type].pending}</span>
                <span>Used: {balance[type].used}</span>
              </p>
            </article>
          ))}
        </div>
      )}

      <Table columns={COLUMNS} empty={loading ? 'Loading...' : 'Abhi tak koi leave apply nahi ki.'}>
        {result.items.map((leave) => (
          <tr key={leave._id}>
            <td>{leave.type}</td>
            <td>{formatDate(leave.fromDate)}</td>
            <td>{formatDate(leave.toDate)}</td>
            <td>{leave.days}</td>
            <td>
              {leave.reason}
              {leave.actionNote && <p className="my-leaves__note">Admin: {leave.actionNote}</p>}
            </td>
            <td>
              <LeaveStatus status={leave.status} />
            </td>
            <td>
              {leave.status === 'PENDING' && (
                <Button size="sm" variant="danger" disabled={busyId === leave._id} onClick={() => handleCancel(leave)}>
                  Cancel
                </Button>
              )}
            </td>
          </tr>
        ))}
      </Table>

      <Pagination page={page} totalPages={result.totalPages} onChange={setPage} />

      {showApply && (
        <Modal title="Apply Leave" onClose={closeApply}>
          <form onSubmit={handleApply} noValidate>
            <Alert>{formError}</Alert>
            <FormField
              label="Leave type"
              name="type"
              options={TYPE_OPTIONS}
              value={form.type}
              onChange={handleChange}
              error={fieldErrors.type}
              hint={`Available: ${balance[form.type].available}`}
              required
            />
            <div className="my-leaves__dates">
              <FormField
                label="From"
                name="fromDate"
                type="date"
                value={form.fromDate}
                onChange={handleChange}
                error={fieldErrors.fromDate}
                required
              />
              <FormField
                label="To"
                name="toDate"
                type="date"
                min={form.fromDate}
                value={form.toDate}
                onChange={handleChange}
                error={fieldErrors.toDate}
                required
              />
            </div>
            <FormField
              label="Reason"
              name="reason"
              multiline
              value={form.reason}
              onChange={handleChange}
              error={fieldErrors.reason}
              required
            />
            <p className="my-leaves__hint">Week off aur holidays leave mein nahi ginte.</p>
            <div className="my-leaves__actions">
              <Button variant="secondary" onClick={closeApply}>
                Close
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Applying...' : 'Apply'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
