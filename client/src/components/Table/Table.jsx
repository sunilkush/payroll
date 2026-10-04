import { Children, isValidElement } from 'react';
import { Card, Descriptions, Empty, Grid, Table as AntTable } from 'antd';
import './Table.css';

// Usage: <Table columns={['Name', 'Email']} empty="Koi record nahi">{rows}</Table>
// rows = <tr> jinke andar seedhe <td> hon, columns ke order mein. (Pages ko Ant Design ke
// columns/dataSource nahi banane padte; ye component <tr>/<td> se khud bana leta hai.)
//
// Responsive (Rule 10):
//   Desktop (992px+)   Ant Design Table
//   Us se chhoti       har row ek Card, andar "column ka naam: value" (tablet par 2 cards ek line mein)
// dense: card mein values 2 column mein (lambi lists ke liye, jaise mahine ki attendance).
// Jis cell mein kuch nahi hai wo card mein dikhta hi nahi.

const isEmptyCell = (children) =>
  Children.toArray(children).every((child) => typeof child === 'string' && child.trim() === '');

export default function Table({ columns, empty = 'Koi record nahi mila.', dense = false, children }) {
  const desktop = Boolean(Grid.useBreakpoint().lg);

  // <tr><td>...</td></tr>  ->  [{ key, cells: [node, node, ...] }]
  const rows = Children.toArray(children)
    .filter(isValidElement)
    .map((row, rowIndex) => ({
      key: row.key ?? rowIndex,
      cells: Children.toArray(row.props.children)
        .filter(isValidElement)
        .map((cell) => ({ className: cell.props.className, content: cell.props.children })),
    }));

  if (desktop) {
    return (
      <AntTable
        className="table"
        size="middle"
        pagination={false}
        dataSource={rows}
        locale={{ emptyText: empty }}
        columns={columns.map((title, index) => ({
          title,
          key: title,
          render: (_, row) => <div className={row.cells[index]?.className}>{row.cells[index]?.content}</div>,
        }))}
      />
    );
  }

  if (!rows.length) return <Empty className="table__empty" description={empty} image={Empty.PRESENTED_IMAGE_SIMPLE} />;

  return (
    <div className={`table table--cards${dense ? ' table--dense' : ''}`}>
      {rows.map((row) => (
        <Card key={row.key} size="small" className="table__card">
          <Descriptions
            size="small"
            column={dense ? 2 : 1}
            layout={dense ? 'vertical' : 'horizontal'}
            items={row.cells
              .map((cell, index) => ({
                key: columns[index],
                label: columns[index],
                children: <div className={cell.className}>{cell.content}</div>,
                empty: isEmptyCell(cell.content),
              }))
              .filter((item) => !item.empty)
              .map(({ empty: _empty, ...item }) => item)}
          />
        </Card>
      ))}
    </div>
  );
}
