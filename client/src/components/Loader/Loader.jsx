import { Spin } from 'antd';
import './Loader.css';

export default function Loader() {
  return (
    <div className="loader" role="status" aria-label="Loading">
      <Spin size="large" />
    </div>
  );
}
