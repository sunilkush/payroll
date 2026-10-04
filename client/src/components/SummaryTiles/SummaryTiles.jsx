import { Card, Statistic } from 'antd';
import './SummaryTiles.css';

// items: [{ label, value }]
export default function SummaryTiles({ items }) {
  return (
    <div className="summary-tiles">
      {items.map((item) => (
        <Card key={item.label} size="small" className="summary-tiles__tile">
          <Statistic title={item.label} value={item.value} />
        </Card>
      ))}
    </div>
  );
}
