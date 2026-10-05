import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import AttendanceMonth from '../../../components/AttendanceMonth/AttendanceMonth.jsx';
import MonthPicker from '../../../components/MonthPicker/MonthPicker.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import { currentMonth } from '../../../utils/format.js';

// Admin: ek staff ki din-wise attendance.
export default function StaffAttendance() {
  const { userId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const month = searchParams.get('month') || currentMonth();
  const [staff, setStaff] = useState(null);

  return (
    <section>
      <PageHeader
        detail
        title={staff ? staff.name : 'Attendance'}
        subtitle={staff?.employeeCode}
        back={{ to: `/admin/attendance?month=${month}`, label: 'Attendance Report' }}
      >
        <MonthPicker value={month} onChange={(value) => setSearchParams({ month: value }, { replace: true })} />
      </PageHeader>
      <AttendanceMonth month={month} userId={userId} onLoad={(data) => setStaff(data.staff)} />
    </section>
  );
}
