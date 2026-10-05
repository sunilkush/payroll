import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAttendanceReportApi } from '../../../api/attendanceApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import MonthPicker from '../../../components/MonthPicker/MonthPicker.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import StatusBadge from '../../../components/StatusBadge/StatusBadge.jsx';
import Table from '../../../components/Table/Table.jsx';
import UserCell from '../../../components/UserCell/UserCell.jsx';
import { currentMonth } from '../../../utils/format.js';
import './Attendance.css';

const COLUMNS = ['Staff', 'Present', 'Absent', 'Leave', 'Week Off', 'Holiday', 'Missed Punch Out'];

// Admin ki monthly report: har staff ke totals. Naam par click karne se din-wise detail khulti hai.
export default function Attendance() {
  // Month URL mein rehta hai taaki detail page se wapas aane par wahi mahina khule.
  const [searchParams, setSearchParams] = useSearchParams();
  const month = searchParams.get('month') || currentMonth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    getAttendanceReportApi(month)
      .then((res) => {
        if (ignore) return;
        setRows(res.data.rows);
        setError('');
      })
      .catch((err) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [month]);

  return (
    <section className="attendance">
      <PageHeader title="Attendance Report" subtitle="Monthly totals per staff. Click a name for the day-by-day view.">
        <MonthPicker value={month} onChange={(value) => setSearchParams({ month: value })} />
      </PageHeader>

      <Alert>{error}</Alert>

      <Table columns={COLUMNS} primary={0} loading={loading} empty="No staff found. Add staff first to see their attendance.">
        {rows.map(({ staff, summary }) => (
          <tr key={staff._id}>
            <td>
              <UserCell
                name={staff.name}
                sub={staff.employeeCode}
                to={`/admin/attendance/${staff._id}?month=${month}`}
                extra={!staff.isActive && <StatusBadge active={false} inactiveLabel="Inactive" />}
              />
            </td>
            <td>{summary.present}</td>
            <td className={summary.absent ? 'attendance__absent' : undefined}>{summary.absent}</td>
            <td>{summary.leave}</td>
            <td>{summary.weekOff}</td>
            <td>{summary.holiday}</td>
            <td className={summary.missedPunchOut ? 'attendance__missed' : undefined}>{summary.missedPunchOut}</td>
          </tr>
        ))}
      </Table>
    </section>
  );
}
