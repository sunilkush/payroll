import { Card, Skeleton } from 'antd';
import EmptyState from '../EmptyState/EmptyState.jsx';
import './ChartCard.css';

// Dashboard ka ek panel: heading, chhoti line, daayein filter (extra), aur andar chart / table / list.
//   loading  andar skeleton dikhta hai
//   empty    text ho to chart ki jagah khali state (jaise "Payroll abhi nahi bani")
export default function ChartCard({ title, subtitle, extra, loading = false, empty, children }) {
  return (
    <Card className="chart-card">
      <header className="chart-card__header">
        <div className="chart-card__heading">
          <h2 className="chart-card__title">{title}</h2>
          {subtitle && <p className="chart-card__subtitle">{subtitle}</p>}
        </div>
        {extra && <div className="chart-card__extra">{extra}</div>}
      </header>
      {loading ? <Skeleton active paragraph={{ rows: 5 }} /> : empty ? <EmptyState text={empty} /> : children}
    </Card>
  );
}
