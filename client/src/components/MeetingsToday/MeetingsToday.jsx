import { useEffect, useState } from 'react';
import { ScheduleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { getMeetingDashboardApi } from '../../api/meetingApi.js';
import { formatTime } from '../../utils/format.js';
import ListCard, { ListRow } from '../ListCard/ListCard.jsx';
import MeetingStatus, { OUTCOME_LABEL } from '../MeetingStatus/MeetingStatus.jsx';
import SummaryTiles from '../SummaryTiles/SummaryTiles.jsx';
import './MeetingsToday.css';

const ROW_TONE = { COMPLETED: 'success', CHECKED_IN: 'warning', MISSED: 'danger', CANCELLED: 'muted' };

// Dashboard ka sales hissa: aaj ki meetings ki ginti aur list.
//   admin = true   company ki saari meetings (har row mein sales manager ka naam), detail page admin ka
//   admin = false  sales manager ki apni meetings, saath mein aane wali meetings aur follow-ups ki ginti
// Apna data khud laata hai, taaki dashboard ke baaki hisse is par nirbhar na rahen. Fail ho to kuch nahi dikhata.
export default function MeetingsToday({ admin = false }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let ignore = false;
    getMeetingDashboardApi()
      .then((res) => !ignore && setData(res.data))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  if (!data) return null;
  const { counts, followUps, month } = data;
  const base = admin ? '/admin/meetings' : '/staff/meetings';

  const tiles = admin
    ? [
        { label: "Today's Meetings", value: counts.total },
        { label: 'Scheduled', value: counts.scheduled },
        { label: 'Checked In', value: counts.checkedIn },
        { label: 'Completed', value: counts.completed },
        { label: 'Missed', value: counts.missed },
        { label: 'Cancelled', value: counts.cancelled },
      ]
    : [
        { label: "Today's Meetings", value: counts.total },
        { label: 'Upcoming', value: counts.upcoming },
        { label: 'Completed (this month)', value: month.completed },
        { label: 'Pending Follow-ups', value: followUps.pending },
        { label: 'Missed (this month)', value: month.missed },
      ];

  return (
    <section className="meetings-today">
      <div className="meetings-today__head">
        <h2 className="meetings-today__title">Sales meetings</h2>
        {admin && (
          <span className="meetings-today__meta">
            {counts.upcoming} upcoming ·{' '}
            <Link to="/admin/follow-ups">
              {followUps.pending} pending follow-up{followUps.pending === 1 ? '' : 's'}
            </Link>
          </span>
        )}
      </div>

      <SummaryTiles items={tiles} />

      <ListCard
        title={admin ? "Today's meetings" : "Today's visits"}
        action={{ to: base, label: 'View all' }}
        empty="No meetings today."
      >
        {data.today.map((meeting) => (
          <ListRow
            key={meeting._id}
            icon={<ScheduleOutlined />}
            tone={ROW_TONE[meeting.status] ?? 'primary'}
            title={`${formatTime(meeting.startAt)} · ${meeting.client}`}
            meta={[admin ? meeting.salesManager : meeting.title, OUTCOME_LABEL[meeting.outcome]].filter(Boolean).join(' · ')}
            right={<MeetingStatus status={meeting.status} />}
            to={`${base}/${meeting._id}`}
          />
        ))}
      </ListCard>
    </section>
  );
}
