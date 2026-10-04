import { Pagination as AntPagination } from 'antd';
import './Pagination.css';

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination">
      {/* Server hamein kul pages deta hai, isliye pageSize 1 rakh kar total = totalPages */}
      <AntPagination current={page} total={totalPages} pageSize={1} showSizeChanger={false} onChange={onChange} />
    </nav>
  );
}
