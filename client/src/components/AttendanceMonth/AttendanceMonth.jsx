import { useEffect, useState } from 'react';
import { getMonthlyAttendanceApi } from '../../api/attendanceApi.js';
import { formatDate, formatTime, WEEKDAYS } from '../../utils/format.js';
import Alert from '../Alert/Alert.jsx';
import AttendanceStatus from '../AttendanceStatus/AttendanceStatus.jsx';
import SummaryTiles from '../SummaryTiles/SummaryTiles.jsx';
import Table from '../Table/Table.jsx';
import './AttendanceMonth.css';

const COLUMNS = ['Date', 'Status', 'Punch In', 'Punch Out', 'Location'];

export const attendanceSummaryItems = (summary) => [
  { label: 'Present', value: summary.present },
  { label: 'Absent', value: summary.absent },
  { label: 'Leave', value: summary.leave },
  { label: 'Week Off', value: summary.weekOff },
  { label: 'Holiday', value: summary.holiday },
  { label: 'Missed Punch Out', value: summary.missedPunchOut },
];

// Ek staff ke ek mahine ki attendance. userId sirf admin deta hai; staff ke liye khali.
// onLoad(data) se parent ko staff ka naam waghera milta hai.
export default function AttendanceMonth({ month, userId, onLoad }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    getMonthlyAttendanceApi({ month, userId })
      .then((res) => {
        if (ignore) return;
        setData(res.data);
        setError('');
        onLoad?.(res.data);
      })
      .catch((err) => !ignore && setError(err.message));
    return () => {
      ignore = true;
    };
    // onLoad ko deps mein nahi rakha: parent har render par naya function deta hai.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, userId]);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <p className="attendance-month__loading">Loading...</p>;

  // Aane wale din aur joining se pehle ke din (status null) mein dikhane ko kuch nahi hota.
  const days = data.days.filter((day) => day.status);

  return (
    <div className="attendance-month">
      <SummaryTiles items={attendanceSummaryItems(data.summary)} />
      {/* Jis din punch nahi hua us din ke punch cells khali rehte hain; phone ke card mein khali cell dikhta hi nahi. */}
      <Table columns={COLUMNS} dense empty="Is mahine mein abhi dikhane layak koi din nahi hai.">
        {days.map((day) => (
          <tr key={day.date}>
            <td>
              {formatDate(day.date)}
              <span className="attendance-month__weekday">{WEEKDAYS[day.weekday].slice(0, 3)}</span>
            </td>
            <td>
              <AttendanceStatus status={day.status} />
              {day.note && <span className="attendance-month__note">{day.note}</span>}
            </td>
            <td>{day.punchIn && formatTime(day.punchIn.time)}</td>
            <td>
              {day.missedPunchOut && <span className="attendance-month__missed">Missed</span>}
              {day.punchOut && formatTime(day.punchOut.time)}
            </td>
            <td>{day.punchIn && `${day.punchIn.locationName ?? 'Office'} (${day.punchIn.distance}m)`}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
