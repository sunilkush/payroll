import Badge from '../Badge/Badge.jsx';

const STATUS = {
  PENDING: { label: 'Pending', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'muted' },
};

export const LEAVE_STATUS_OPTIONS = [
  { value: 'all', label: 'All status' },
  ...Object.entries(STATUS).map(([value, { label }]) => ({ value, label })),
];

export const LEAVE_TYPE_LABEL = { CL: 'Casual Leave (CL)', EL: 'Earned Leave (EL)' };

// leave.halfDay -> din ka kaun sa hissa
export const HALF_DAY_LABEL = { FIRST: 'First half', SECOND: 'Second half' };

export default function LeaveStatus({ status }) {
  const config = STATUS[status] ?? { label: status, tone: 'muted' };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
