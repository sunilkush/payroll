import { RightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import ChartCard from '../ChartCard/ChartCard.jsx';
import './ListCard.css';

// Dashboard ki chhoti list (pending requests, aane wale din, activity). Rows ke liye <ListRow> use karo.
//   action   { to, label } - upar daayein "View all" jaisa link
//   empty    rows na hon to ye text
//   loading  skeleton
export default function ListCard({ title, subtitle, action, empty = 'Nothing here yet.', loading = false, children }) {
  const rows = [children].flat().filter(Boolean);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      loading={loading}
      empty={rows.length ? undefined : empty}
      extra={
        action && (
          <Link to={action.to} className="list-card__action">
            {action.label}
          </Link>
        )
      }
    >
      <ul className="list-card__list">{rows}</ul>
    </ChartCard>
  );
}

// Ek row: icon (optional), title + meta, daayein taraf kuch (badge / amount / time).
//   tone  icon ke dabbe ka rang: primary | success | warning | danger | muted
//   to    ho to poori row link hai
export function ListRow({ icon, tone = 'primary', title, meta, right, to }) {
  return (
    <li className="list-card__row">
      {icon && <span className={`list-card__icon list-card__icon--${tone}`}>{icon}</span>}
      <div className="list-card__text">
        <p className="list-card__title">{title}</p>
        {meta && <p className="list-card__meta">{meta}</p>}
      </div>
      {right && <div className="list-card__right">{right}</div>}
      {to && (
        <>
          <RightOutlined className="list-card__arrow" />
          <Link to={to} className="list-card__link" aria-label={`Open ${title}`} />
        </>
      )}
    </li>
  );
}
