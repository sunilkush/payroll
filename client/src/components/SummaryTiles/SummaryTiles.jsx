import './SummaryTiles.css';

// items: [{ label, value }]
export default function SummaryTiles({ items }) {
  return (
    <dl className="summary-tiles">
      {items.map((item) => (
        <div key={item.label} className="summary-tiles__tile">
          <dt className="summary-tiles__label">{item.label}</dt>
          <dd className="summary-tiles__value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
