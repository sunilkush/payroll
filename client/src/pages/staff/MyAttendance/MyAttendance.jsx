import { useState } from 'react';
import AttendanceMonth from '../../../components/AttendanceMonth/AttendanceMonth.jsx';
import MonthPicker from '../../../components/MonthPicker/MonthPicker.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import { currentMonth } from '../../../utils/format.js';

export default function MyAttendance() {
  const [month, setMonth] = useState(currentMonth);

  return (
    <section>
      <PageHeader title="My Attendance">
        <MonthPicker value={month} onChange={setMonth} />
      </PageHeader>
      <AttendanceMonth month={month} />
    </section>
  );
}
