import { useCallback, useEffect, useState } from 'react';
import { downloadSlip, listMyPayrollsApi } from '../../../api/payrollApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import Modal from '../../../components/Modal/Modal.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import SalarySlip from '../../../components/SalarySlip/SalarySlip.jsx';
import Table from '../../../components/Table/Table.jsx';
import { formatCurrency, formatMonth } from '../../../utils/format.js';
import './MySalary.css';

const COLUMNS = ['Month', 'Payable Days', 'Earned Gross', 'Deductions', 'Net Salary', 'Slip'];

export default function MySalary() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const closeView = useCallback(() => setViewing(null), []);

  useEffect(() => {
    listMyPayrollsApi()
      .then((res) => setRows(res.data.rows))
      .catch((err) => setError(err.message));
  }, []);

  const handleDownload = async (payroll) => {
    setDownloading(true);
    setError('');
    try {
      await downloadSlip(payroll);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="my-salary">
      <PageHeader title="My Salary" subtitle="Final ho chuki salary slips" />
      <Alert>{error}</Alert>

      <Table columns={COLUMNS} empty={rows ? 'Abhi tak koi salary slip nahi bani.' : 'Loading...'}>
        {(rows ?? []).map((payroll) => (
          <tr key={payroll._id}>
            <td>{formatMonth(payroll.period)}</td>
            <td>
              {payroll.payableDays}
              {payroll.lopDays > 0 && <span className="my-salary__lop"> (LOP {payroll.lopDays})</span>}
            </td>
            <td>{formatCurrency(payroll.earnings.gross)}</td>
            <td>{formatCurrency(payroll.deductions.total)}</td>
            <td className="my-salary__net">{formatCurrency(payroll.netSalary)}</td>
            <td>
              <div className="my-salary__actions">
                <Button size="sm" onClick={() => setViewing(payroll)}>
                  View
                </Button>
                <Button size="sm" variant="secondary" disabled={downloading} onClick={() => handleDownload(payroll)}>
                  PDF
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {viewing && (
        <Modal title="Salary Slip" onClose={closeView}>
          <SalarySlip payroll={viewing} />
          <div className="my-salary__modal-actions">
            <Button variant="secondary" onClick={closeView}>
              Close
            </Button>
            <Button disabled={downloading} onClick={() => handleDownload(viewing)}>
              {downloading ? 'Downloading...' : 'Download PDF'}
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
