import './Badge.css';

// tone: success | danger | warning | info | muted
export default function Badge({ tone = 'muted', children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
