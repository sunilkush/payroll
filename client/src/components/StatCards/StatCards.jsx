import { Card, Skeleton } from 'antd';
import { Link } from 'react-router-dom';
import './StatCards.css';

// Dashboard ke number wale cards.
// items: [{ label, value, hint, icon, tone, to }]
//   tone: primary | success | warning | danger | accent   (icon ke dabbe ka rang)
//   to:   ho to poora card us page ka link ban jata hai
//   value undefined ho (data abhi aa raha hai) to skeleton dikhta hai
export default function StatCards({ items }) {
  return (
    <ul className="stat-cards">
      {items.map((item) => (
        <li key={item.label}>
          <Card size="small" className="stat-cards__card" hoverable={Boolean(item.to)}>
            <span className={`stat-cards__icon stat-cards__icon--${item.tone ?? 'primary'}`}>{item.icon}</span>
            <div className="stat-cards__body">
              <p className="stat-cards__label">{item.label}</p>
              {item.value === undefined ? (
                <Skeleton.Button active size="small" className="stat-cards__skeleton" />
              ) : (
                <p className="stat-cards__value">{item.value}</p>
              )}
              {item.hint && <p className="stat-cards__hint">{item.hint}</p>}
            </div>
            {item.to && <Link to={item.to} className="stat-cards__link" aria-label={`${item.label} kholein`} />}
          </Card>
        </li>
      ))}
    </ul>
  );
}
