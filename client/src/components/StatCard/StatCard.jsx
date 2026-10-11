import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { Card, Skeleton } from 'antd';
import { Link } from 'react-router-dom';
import { Sparkline } from '../Charts/Charts.jsx';
import './StatCard.css';

// KPI card: title, bada number, pichhle period se badlav, chhoti trend line.
//   title, value   kya aur kitna
//   icon, tone     daayein upar ka icon; tone = primary | success | warning | danger | info
//   delta          { value, unit, label, neutral }  jaise { value: 8.4, unit: '%', label: 'vs last month' }
//                  value null/undefined ho to badlav nahi dikhta. neutral: badhna "achha" ya "bura" nahi
//                  (jaise kharcha), to rang nahi lagta.
//   hint           delta na ho to (ya uske saath) chhoti line
//   series         [{ value }] ho to neeche sparkline
//   to             ho to poora card us page ka link
//   loading        data aa raha hai
export default function StatCard({ title, value, icon, tone = 'primary', delta, hint, series, to, loading = false, className = '' }) {
  const change = delta?.value;
  const hasDelta = change !== null && change !== undefined;
  let direction = 'flat';
  if (hasDelta && change > 0) direction = 'up';
  if (hasDelta && change < 0) direction = 'down';
  const mood = delta?.neutral || direction === 'flat' ? 'neutral' : direction === 'up' ? 'good' : 'bad';

  return (
    <Card className={`stat-card ${className}`.trim()} hoverable={Boolean(to)}>
      <div className="stat-card__head">
        <span className="stat-card__title">{title}</span>
        {icon && <span className={`stat-card__icon stat-card__icon--${tone}`}>{icon}</span>}
      </div>

      {loading ? (
        <Skeleton active title={{ width: '60%' }} paragraph={{ rows: 1, width: '80%' }} />
      ) : (
        <>
          <p className="stat-card__value">{value}</p>
          <p className="stat-card__foot">
            {hasDelta && (
              <span className={`stat-card__delta stat-card__delta--${mood}`}>
                {direction === 'up' && <ArrowUpOutlined />}
                {direction === 'down' && <ArrowDownOutlined />}
                {change > 0 ? '+' : ''}
                {change}
                {delta.unit}
              </span>
            )}
            <span className="stat-card__hint">{hasDelta ? delta.label : hint}</span>
          </p>
          {series?.length > 1 && <Sparkline data={series} tone={tone === 'info' ? 'primary' : tone} />}
        </>
      )}

      {to && <Link to={to} className="stat-card__link" aria-label={`Open ${title}`} />}
    </Card>
  );
}

// KPI cards ki line: phone par ek column, tablet par 2, badi screen par 4
export function StatGrid({ children, className = '' }) {
  return <div className={`stat-grid ${className}`.trim()}>{children}</div>;
}
