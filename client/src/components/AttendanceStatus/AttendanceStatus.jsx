import Badge from '../Badge/Badge.jsx';

const STATUS = {
  PRESENT: { label: 'Present', tone: 'success' },
  HALF_DAY: { label: 'Half Day', tone: 'warning' },
  LEAVE: { label: 'Leave', tone: 'info' },
  ABSENT: { label: 'Absent', tone: 'danger' },
  WEEK_OFF: { label: 'Week Off', tone: 'muted' },
  HOLIDAY: { label: 'Holiday', tone: 'info' },
  NOT_MARKED: { label: 'Not marked', tone: 'warning' },
};

export default function AttendanceStatus({ status }) {
  const config = STATUS[status];
  if (!config) return '-';
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
