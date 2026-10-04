import { RightOutlined } from '@ant-design/icons';
import { Card, Empty } from 'antd';
import { Link } from 'react-router-dom';
import './ListCard.css';

// Dashboard ki chhoti list (jaise pending leave requests). Rows ke liye <ListRow> use karo.
// action: { to, label } - card ke upar daayein "Sab dekhein" jaisa link.
export default function ListCard({ title, action, empty = 'Abhi kuch nahi hai.', children }) {
  const rows = [children].flat().filter(Boolean);

  return (
    <Card
      className="list-card"
      title={title}
      extra={
        action && (
          <Link to={action.to} className="list-card__action">
            {action.label}
          </Link>
        )
      }
    >
      {rows.length ? (
        <ul className="list-card__list">{rows}</ul>
      ) : (
        <Empty description={empty} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Card>
  );
}

// Ek row: icon (optional), title + meta, daayein taraf kuch (badge / amount). to ho to poori row link hai.
export function ListRow({ icon, title, meta, right, to }) {
  return (
    <li className="list-card__row">
      {icon && <span className="list-card__icon">{icon}</span>}
      <div className="list-card__text">
        <p className="list-card__title">{title}</p>
        {meta && <p className="list-card__meta">{meta}</p>}
      </div>
      {right && <div className="list-card__right">{right}</div>}
      {to && (
        <>
          <RightOutlined className="list-card__arrow" />
          <Link to={to} className="list-card__link" aria-label={`${title} kholein`} />
        </>
      )}
    </li>
  );
}
