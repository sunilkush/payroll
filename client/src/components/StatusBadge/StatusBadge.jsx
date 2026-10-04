import './StatusBadge.css';

export default function StatusBadge({ active, activeLabel = 'Active', inactiveLabel = 'Blocked' }) {
  return (
    <span className={`status-badge status-badge--${active ? 'active' : 'inactive'}`}>
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
