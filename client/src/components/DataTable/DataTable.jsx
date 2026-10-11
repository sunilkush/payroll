import { useMemo, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Input, Table } from 'antd';
import EmptyState from '../EmptyState/EmptyState.jsx';
import './DataTable.css';

// Dashboard ki table: search, column par click karke sorting, pagination, row par hover.
// Phone par table daayein-baayein khiskti hai (page nahi), columns kat-te nahi.
//   columns     Ant Design ke columns: { title, key, render, sorter, align, width }
//   rows        data
//   rowKey      har row ki unique key (function ya field ka naam)
//   searchText  (row) => string; ho to upar search box aata hai
//   pageSize    ek page par kitni rows (us se kam hon to pagination chhup jata hai)
//
// List pages (Staff, Companies...) is ki jagah components/Table use karte hain, jo phone par cards banata hai.
export default function DataTable({
  columns,
  rows,
  rowKey,
  searchText,
  searchPlaceholder = 'Search',
  pageSize = 8,
  empty = 'No records found.',
  size = 'middle',
  className = '',
  extraHeader = null,
}) {
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text || !searchText) return rows;
    return rows.filter((row) => searchText(row).toLowerCase().includes(text));
  }, [rows, query, searchText]);

  return (
    <div className={`data-table ${className}`.trim()}>
      {(searchText || extraHeader) && (
        <div className="data-table__toolbar">
          {searchText && (
            <Input
              className="data-table__search"
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              prefix={<SearchOutlined className="data-table__search-icon" />}
              allowClear
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          )}
          {extraHeader && <div className="data-table__extra">{extraHeader}</div>}
        </div>
      )}
      <Table
        size={size}
        columns={columns}
        dataSource={visible}
        rowKey={rowKey}
        scroll={{ x: 'max-content' }}
        showSorterTooltip={false}
        pagination={{ pageSize, hideOnSinglePage: true, showSizeChanger: false, size: 'small' }}
        locale={{ emptyText: <EmptyState text={query ? `No results for “${query.trim()}”` : empty} /> }}
      />
    </div>
  );
}
