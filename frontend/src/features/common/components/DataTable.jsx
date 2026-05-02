import { Table } from 'antd';

export default function DataTable({ columns, dataSource, loading, pagination, onChange, rowKey = 'id' }) {
  return (
    <Table
      rowKey={rowKey}
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      pagination={{ showSizeChanger: true, ...pagination }}
      onChange={onChange}
      scroll={{ x: 900 }}
    />
  );
}
