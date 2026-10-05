import { Pagination as AntPagination } from 'antd';
import './Pagination.css';

// Do tarah se chalta hai:
//   <Pagination page totalPages onChange />        server ne kul pages bataye (Staff, Companies...)
//   <Pagination page total pageSize onChange />    kul rows pata hain; "11-20 of 42" bhi dikhta hai
export default function Pagination({ page, totalPages, total, pageSize, onChange }) {
  const counted = total !== undefined;
  const pages = counted ? Math.ceil(total / pageSize) : totalPages;
  if (pages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination">
      <AntPagination
        current={page}
        // Sirf kul pages pata hon to pageSize 1 rakh kar total = totalPages
        total={counted ? total : totalPages}
        pageSize={counted ? pageSize : 1}
        showSizeChanger={false}
        showTotal={counted ? (count, [from, to]) => `${from}-${to} of ${count}` : undefined}
        onChange={onChange}
      />
    </nav>
  );
}
