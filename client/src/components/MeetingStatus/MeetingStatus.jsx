import Badge from '../Badge/Badge.jsx';

const STATUS = {
  SCHEDULED: { label: 'Scheduled', tone: 'info' },
  QR_SENT: { label: 'QR Sent', tone: 'info' },
  CHECKED_IN: { label: 'Checked In', tone: 'warning' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  MISSED: { label: 'Missed', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'muted' },
};

// List ke tabs: sabse kaam ke pehle
export const MEETING_STATUS_TABS = [
  { value: 'all', label: 'All' },
  ...Object.entries(STATUS).map(([value, { label }]) => ({ value, label })),
];

const LOCATION_STATUS = {
  VERIFIED: { label: 'Verified', tone: 'success' },
  OUTSIDE_GEOFENCE: { label: 'Outside area', tone: 'danger' },
  LOCATION_UNAVAILABLE: { label: 'No location', tone: 'muted' },
  LOW_ACCURACY: { label: 'Low accuracy', tone: 'warning' },
};

export const OUTCOME_LABEL = {
  INTERESTED: 'Interested',
  FOLLOW_UP_REQUIRED: 'Follow-up Required',
  PROPOSAL_REQUIRED: 'Proposal Required',
  DEMO_REQUIRED: 'Demo Required',
  NOT_INTERESTED: 'Not Interested',
  DEAL_CLOSED: 'Deal Closed',
  RESCHEDULED: 'Rescheduled',
  CLIENT_UNAVAILABLE: 'Client Unavailable',
};

// Audit history (meeting.events) ki line
export const EVENT_LABEL = {
  CREATED: 'Meeting created',
  UPDATED: 'Meeting updated',
  QR_GENERATED: 'QR generated',
  QR_SENT: 'QR sent',
  QR_SCANNED: 'QR scanned',
  CHECK_IN_REJECTED: 'Check-in rejected',
  CHECKED_IN: 'Checked in',
  CHECKED_OUT: 'Checked out',
  COMPLETED: 'Meeting completed',
  MISSED: 'Marked as missed',
  CANCELLED: 'Meeting cancelled',
};

// Jin status mein meeting abhi badli / cancel ki ja sakti hai (check-in se pehle).
export const isOpenMeeting = (meeting) => meeting.status === 'SCHEDULED' || meeting.status === 'QR_SENT';

// 55 -> '55 min', 125 -> '2h 5m'
export const formatDuration = (minutes) => {
  if (minutes == null) return '';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export function LocationStatus({ status }) {
  const config = LOCATION_STATUS[status];
  if (!config) return null;
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

export default function MeetingStatus({ status }) {
  const config = STATUS[status] ?? { label: status, tone: 'muted' };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
