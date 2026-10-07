import { useEffect, useState } from 'react';
import { Calendar, Card, Grid, Segmented } from 'antd';
import dayjs from 'dayjs';
import { getMonthlyAttendanceApi } from '../../api/attendanceApi.js';
import { formatDate, formatTime, todayLocal, WEEKDAYS } from '../../utils/format.js';
import Alert from '../Alert/Alert.jsx';
import AttendanceStatus from '../AttendanceStatus/AttendanceStatus.jsx';
import Button from '../Button/Button.jsx';
import { HALF_DAY_LABEL } from '../LeaveStatus/LeaveStatus.jsx';
import SummaryTiles from '../SummaryTiles/SummaryTiles.jsx';
import Table from '../Table/Table.jsx';
import './AttendanceMonth.css';

const COLUMNS = ['Date', 'Status', 'Punch In', 'Punch Out', 'Location'];
const VIEWS = [
  { value: 'calendar', label: 'Calendar' },
  { value: 'list', label: 'List' },
];
// Calendar ke neeche rangon ka matlab
const LEGEND = ['PRESENT', 'HALF_DAY', 'ABSENT', 'LEAVE', 'HOLIDAY', 'WEEK_OFF'];
const DATE_FORMAT = 'YYYY-MM-DD';

export const attendanceSummaryItems = (summary) => [
  { label: 'Present', value: summary.present },
  { label: 'Absent', value: summary.absent },
  { label: 'Leave', value: summary.leave },
  { label: 'Week Off', value: summary.weekOff },
  { label: 'Holiday', value: summary.holiday },
  { label: 'Missed Punch Out', value: summary.missedPunchOut },
];

// Correction request se bane punch ki GPS location nahi hoti.
const punchLocation = (punch) =>
  punch.distance == null ? 'Corrected by admin' : `${punch.locationName ?? 'Office'} (${punch.distance}m)`;

// Jin dino punch chhoota ho sakta hai: Absent, aaj punch nahi kiya, ya punch out nahi hua.
const fixable = (day) =>
  day.status === 'ABSENT' || day.status === 'NOT_MARKED' || (day.punchIn && !day.punchOut);

// Status ke saath ki chhoti jaankari: holiday ka naam, leave ka type, half day ka hissa.
const dayNote = (day) =>
  day.halfDay ? `Half day ${day.note} (${HALF_DAY_LABEL[day.halfDay].toLowerCase()})` : day.note;

// Ek staff ke ek mahine ki attendance: calendar (default) ya list.
// userId sirf admin deta hai; staff ke liye khali. onLoad(data) se parent ko staff ka naam waghera milta hai.
// onFix(date) ho to chhoote hue punch wale dino par "Fix punch" button dikhta hai (staff ke liye).
export default function AttendanceMonth({ month, userId, onLoad, onFix }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('calendar');
  const [selected, setSelected] = useState(null);
  // Chhoti screen par cell mein sirf tarikh aur rang; tablet se status aur punch time bhi.
  const roomy = Boolean(Grid.useBreakpoint().md);

  useEffect(() => {
    let ignore = false;
    getMonthlyAttendanceApi({ month, userId })
      .then((res) => {
        if (ignore) return;
        setData(res.data);
        setError('');
        // Chalu mahine mein aaj ka din khula mile, purane mahine mein koi nahi.
        setSelected(todayLocal().startsWith(month) ? todayLocal() : null);
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
  if (!data || data.month !== month) return <p className="attendance-month__loading">Loading...</p>;

  // Aane wale din aur joining se pehle ke din (status null) mein dikhane ko kuch nahi hota.
  const days = data.days.filter((day) => day.status);
  const dayByDate = new Map(days.map((day) => [day.date, day]));
  const selectedDay = dayByDate.get(selected);

  const renderCell = (date, info) => {
    if (info.type !== 'date') return info.originNode;
    const key = date.format(DATE_FORMAT);
    const day = key.startsWith(month) ? dayByDate.get(key) : null;
    const classes = ['attendance-calendar__cell'];
    if (!key.startsWith(month)) classes.push('attendance-calendar__cell--outside');
    if (day) classes.push(`attendance-calendar__cell--${day.status.toLowerCase().replace('_', '-')}`);
    if (key === selected) classes.push('attendance-calendar__cell--selected');
    if (key === todayLocal()) classes.push('attendance-calendar__cell--today');
    return (
      <div className={classes.join(' ')}>
        <span className="attendance-calendar__number">{date.date()}</span>
        {day && roomy && (
          <>
            <AttendanceStatus status={day.status} />
            {day.punchIn && (
              <span className="attendance-calendar__time">
                {formatTime(day.punchIn.time)}
                {day.punchOut && ` - ${formatTime(day.punchOut.time)}`}
              </span>
            )}
            {dayNote(day) && <span className="attendance-calendar__time">{dayNote(day)}</span>}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="attendance-month">
      <SummaryTiles items={attendanceSummaryItems(data.summary)} />

      <Segmented className="attendance-month__views" options={VIEWS} value={view} onChange={setView} />

      {view === 'calendar' ? (
        <>
          <Calendar
            className="attendance-calendar"
            fullscreen={false}
            // Mahina upar ke MonthPicker se badalta hai, isliye calendar ka apna header nahi.
            headerRender={() => null}
            value={dayjs(selected ?? `${month}-01`, DATE_FORMAT)}
            validRange={[dayjs(`${month}-01`, DATE_FORMAT), dayjs(`${month}-01`, DATE_FORMAT).endOf('month')]}
            fullCellRender={renderCell}
            onSelect={(date) => setSelected(date.format(DATE_FORMAT))}
          />

          <ul className="attendance-calendar__legend">
            {LEGEND.map((status) => (
              <li key={status}>
                <AttendanceStatus status={status} />
              </li>
            ))}
          </ul>

          {/* Chune hue din ka poora byora (phone par cell mein jagah nahi hoti) */}
          <Card size="small" className="attendance-calendar__detail">
            {selectedDay ? (
              <>
                <p className="attendance-calendar__detail-title">
                  {formatDate(selectedDay.date)}
                  <span className="attendance-month__weekday">{WEEKDAYS[selectedDay.weekday]}</span>
                </p>
                <p>
                  <AttendanceStatus status={selectedDay.status} />
                  {dayNote(selectedDay) && <span className="attendance-month__note">{dayNote(selectedDay)}</span>}
                </p>
                {selectedDay.punchIn && (
                  <dl className="attendance-calendar__punches">
                    <dt>Punch in</dt>
                    <dd>{formatTime(selectedDay.punchIn.time)}</dd>
                    <dt>Punch out</dt>
                    <dd>
                      {selectedDay.punchOut ? formatTime(selectedDay.punchOut.time) : '-'}
                      {selectedDay.missedPunchOut && <span className="attendance-month__missed"> Missed</span>}
                    </dd>
                    <dt>Location</dt>
                    <dd>{punchLocation(selectedDay.punchIn)}</dd>
                  </dl>
                )}
                {onFix && fixable(selectedDay) && (
                  <Button size="sm" variant="secondary" onClick={() => onFix(selectedDay.date)}>
                    Fix punch
                  </Button>
                )}
              </>
            ) : (
              <p className="attendance-month__loading">
                {selected ? 'Nothing recorded for this day.' : 'Select a day to see its details.'}
              </p>
            )}
          </Card>
        </>
      ) : (
        // Jis din punch nahi hua us din ke punch cells khali rehte hain; phone ke card mein khali cell dikhta hi nahi.
        // key: mahina badalne par pagination pehle page se shuru ho
        <Table key={month} columns={onFix ? [...COLUMNS, 'Actions'] : COLUMNS} dense empty="No days to show for this month yet.">
          {days.map((day) => (
            <tr key={day.date}>
              <td>
                {formatDate(day.date)}
                <span className="attendance-month__weekday">{WEEKDAYS[day.weekday].slice(0, 3)}</span>
              </td>
              <td>
                <AttendanceStatus status={day.status} />
                {dayNote(day) && <span className="attendance-month__note">{dayNote(day)}</span>}
              </td>
              <td>{day.punchIn && formatTime(day.punchIn.time)}</td>
              <td>
                {day.missedPunchOut && <span className="attendance-month__missed">Missed</span>}
                {day.punchOut && formatTime(day.punchOut.time)}
              </td>
              <td>{day.punchIn && punchLocation(day.punchIn)}</td>
              {onFix && (
                <td>
                  {fixable(day) && (
                    <Button size="sm" variant="secondary" onClick={() => onFix(day.date)}>
                      Fix punch
                    </Button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
