import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AttendanceMonth from '../../../components/AttendanceMonth/AttendanceMonth.jsx';
import MonthPicker from '../../../components/MonthPicker/MonthPicker.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import { currentMonth } from '../../../utils/format.js';

export default function MyAttendance() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonth);

  return (
    <section>
      <PageHeader title="My Attendance">
        <MonthPicker value={month} onChange={setMonth} />
      </PageHeader>
      {/* Punch bhool gaye din se seedha correction request ka form */}
      <AttendanceMonth month={month} onFix={(date) => navigate(`/staff/corrections?date=${date}`)} />
    </section>
  );
}
