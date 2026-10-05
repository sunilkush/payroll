import { useCallback, useEffect, useState } from 'react';
import {
  downloadPayrollExcel,
  downloadSlip,
  finalizePayrollApi,
  generatePayrollApi,
  listPayrollApi,
  updatePayrollApi,
} from '../../../api/payrollApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Badge from '../../../components/Badge/Badge.jsx';
import Button from '../../../components/Button/Button.jsx';
import FormField from '../../../components/FormField/FormField.jsx';
import Modal from '../../../components/Modal/Modal.jsx';
import MonthPicker from '../../../components/MonthPicker/MonthPicker.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import SalarySlip from '../../../components/SalarySlip/SalarySlip.jsx';
import SummaryTiles from '../../../components/SummaryTiles/SummaryTiles.jsx';
import Table from '../../../components/Table/Table.jsx';
import UserCell from '../../../components/UserCell/UserCell.jsx';
import { toFieldErrors } from '../../../utils/formErrors.js';
import { currentMonth, formatCurrency, formatMonth } from '../../../utils/format.js';
import { useFeedback } from '../../../utils/useFeedback.js';
import './Payroll.css';

const COLUMNS = ['Staff', 'Days', 'Earned Gross', 'PF', 'ESI', 'Other', 'Net Salary', 'Status', 'Actions'];

const totalsItems = (totals) => [
  { label: 'Earned Gross', value: formatCurrency(totals.earnedGross) },
  { label: 'PF', value: formatCurrency(totals.pf) },
  { label: 'ESI', value: formatCurrency(totals.esi) },
  { label: 'Other Deductions', value: formatCurrency(totals.other) },
  { label: 'Net Payable', value: formatCurrency(totals.netSalary) },
  { label: 'Employer Contribution', value: formatCurrency(totals.employerContribution) },
];

export default function Payroll() {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState(null);
  const { toast, confirm } = useFeedback();
  // notify({ type: 'success' | 'error', text }): upar toast dikhata hai
  const notify = ({ type, text }) => text && toast[type](text);
  const [busy, setBusy] = useState(false);

  // Screen par slip dekhne wala modal
  const [viewing, setViewing] = useState(null);
  const closeView = useCallback(() => setViewing(null), []);

  // "Other deductions" edit modal
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ otherDeductions: '', remarks: '' });
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let ignore = false;
    setData(null);
    listPayrollApi(month)
      .then((res) => !ignore && setData(res.data))
      .catch((err) => !ignore && notify({ type: 'error', text: err.message }));
    return () => {
      ignore = true;
    };
  }, [month]);

  const closeEdit = useCallback(() => {
    setEditing(null);
    setFormError('');
    setFieldErrors({});
  }, []);

  // Generate / finalize / download ka common wrapper. action naya data lautaye to table update hoti hai.
  const run = async (action, successText) => {
    setBusy(true);
    try {
      const res = await action();
      if (res?.data?.rows) setData(res.data);
      if (successText) notify({ type: 'success', text: successText });
    } catch (err) {
      notify({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = () => run(() => generatePayrollApi(month), 'Payroll generated.');

  const handleFinalize = async () => {
    const ok = await confirm({
      title: `Finalize payroll for ${formatMonth(month)}?`,
      content: 'Once final it cannot be changed or regenerated, and staff will be able to see their salary slips.',
      okText: 'Finalize',
    });
    if (ok) run(() => finalizePayrollApi(month), `Payroll for ${formatMonth(month)} finalized.`);
  };

  const openEdit = (payroll) => {
    setForm({ otherDeductions: String(payroll.deductions.other), remarks: payroll.remarks ?? '' });
    setEditing(payroll);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFormError('');
    setFieldErrors({});
    try {
      await updatePayrollApi(editing._id, {
        otherDeductions: form.otherDeductions === '' ? 0 : Number(form.otherDeductions),
        remarks: form.remarks,
      });
      const res = await listPayrollApi(month);
      setData(res.data);
      closeEdit();
    } catch (err) {
      setFormError(err.message);
      setFieldErrors(toFieldErrors(err));
    } finally {
      setBusy(false);
    }
  };

  const rows = data?.rows ?? [];
  const hasRows = rows.length > 0;

  return (
    <section className="payroll">
      <PageHeader title="Payroll" subtitle={formatMonth(month)}>
        <MonthPicker value={month} onChange={setMonth} />
        <Button disabled={busy || !data} onClick={handleGenerate}>
          {hasRows ? 'Regenerate' : 'Generate Payroll'}
        </Button>
        {hasRows && (
          <Button variant="secondary" disabled={busy} onClick={() => run(() => downloadPayrollExcel(month))}>
            Export Excel
          </Button>
        )}
        {data?.hasDraft && data.monthCompleted && (
          <Button variant="secondary" disabled={busy} onClick={handleFinalize}>
            Finalize
          </Button>
        )}
      </PageHeader>

      {data?.hasDraft && !data.monthCompleted && (
        <p className="payroll__note">
          This month is still running, so the payroll is a draft: the remaining days are counted as paid.
          Regenerate and finalize once the month is over.
        </p>
      )}
      {hasRows && data.hasDraft && (
        <p className="payroll__note">
          Click Regenerate after changing attendance, leave, salary or PF/ESI settings. Finalized entries do
          not change.
        </p>
      )}

      {hasRows && <SummaryTiles items={totalsItems(data.totals)} />}

      <Table
        columns={COLUMNS}
        primary={0}
        loading={!data}
        empty='Payroll has not been generated for this month. Click "Generate Payroll".'
      >
        {rows.map((payroll) => (
          <tr key={payroll._id}>
            <td>
              <UserCell name={payroll.staff.name} sub={payroll.staff.employeeCode} />
            </td>
            <td>
              {payroll.payableDays}
              {payroll.lopDays > 0 && <span className="payroll__lop"> (LOP {payroll.lopDays})</span>}
            </td>
            <td>{formatCurrency(payroll.earnings.gross)}</td>
            <td>{formatCurrency(payroll.deductions.pf)}</td>
            <td>{formatCurrency(payroll.deductions.esi)}</td>
            <td>{formatCurrency(payroll.deductions.other)}</td>
            <td className="payroll__net">{formatCurrency(payroll.netSalary)}</td>
            <td>
              <Badge tone={payroll.status === 'FINAL' ? 'success' : 'warning'}>
                {payroll.status === 'FINAL' ? 'Final' : 'Draft'}
              </Badge>
            </td>
            <td>
              <div className="payroll__actions">
                <Button size="sm" variant="secondary" onClick={() => setViewing(payroll)}>
                  View
                </Button>
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => downloadSlip(payroll))}>
                  PDF
                </Button>
                {payroll.status === 'DRAFT' && (
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => openEdit(payroll)}>
                    Deduction
                  </Button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {viewing && (
        <Modal title="Salary Slip" onClose={closeView}>
          <SalarySlip payroll={viewing} />
          <div className="payroll__modal-actions">
            <Button variant="secondary" onClick={closeView}>
              Close
            </Button>
            <Button disabled={busy} onClick={() => run(() => downloadSlip(viewing))}>
              Download PDF
            </Button>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title={`Other Deductions: ${editing.staff.name}`} onClose={closeEdit}>
          <form onSubmit={handleEditSubmit} noValidate>
            <Alert>{formError}</Alert>
            <FormField
              label="Other deductions (Rs.)"
              name="otherDeductions"
              type="number"
              min="0"
              step="0.01"
              value={form.otherDeductions}
              onChange={(event) => setForm((prev) => ({ ...prev, otherDeductions: event.target.value }))}
              error={fieldErrors.otherDeductions}
              hint="Advance, fines, etc. PF/ESI are deducted automatically."
              autoFocus
            />
            <FormField
              label="Remarks (shown on the slip)"
              name="remarks"
              maxLength={200}
              value={form.remarks}
              onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))}
              error={fieldErrors.remarks}
            />
            <div className="payroll__modal-actions">
              <Button variant="secondary" onClick={closeEdit}>
                Close
              </Button>
              <Button type="submit" disabled={busy}>
                Save
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
