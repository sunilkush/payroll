import Badge from '../Badge/Badge.jsx';

export default function StatusBadge({ active, activeLabel = 'Active', inactiveLabel = 'Blocked' }) {
  return <Badge tone={active ? 'success' : 'danger'}>{active ? activeLabel : inactiveLabel}</Badge>;
}
