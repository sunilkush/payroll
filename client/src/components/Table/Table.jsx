import { Children, isValidElement } from 'react';
import { Card, Descriptions, Empty, Grid, Skeleton, Table as AntTable } from 'antd';
import './Table.css';

// Usage: <Table columns={['Name', 'Email']} empty="Koi record nahi">{rows}</Table>
// rows = <tr> jinke andar seedhe <td> hon, columns ke order mein. (Pages ko Ant Design ke
// columns/dataSource nahi banane padte; ye component <tr>/<td> se khud bana leta hai.)
//
// Responsive (Rule 10):
//   Desktop (992px+)   Ant Design Table
//   Us se chhoti       har row ek Card, andar "column ka naam: value" (tablet par 2 cards ek line mein)
//
// Props:
//   loading   data aa raha hai: desktop par table ka spinner, mobile par skeleton cards
//   empty     jab koi row na ho tab ka text (ya koi bhi JSX, jaise button ke saath)
//   primary   us column ka index jo mobile card ka heading bane (jaise naam wala column)
//   dense     card mein values 2 column mein (lambi lists ke liye, jaise mahine ki attendance)
// Jis cell mein kuch nahi hai wo card mein dikhta hi nahi.

const isEmptyCell = (children) =>
  Children.toArray(children).every((child) => typeof child === 'string' && child.trim() === '');

export default function Table({ columns, empty = 'No records found.', loading = false, primary, dense = false, children }) {
  const desktop = Boolean(Grid.useBreakpoint().lg);

  // <tr><td>...</td></tr>  ->  [{ key, cells: [{ className, content }, ...] }]
  const rows = Children.toArray(children)
    .filter(isValidElement)
    .map((row, rowIndex) => ({
      key: row.key ?? rowIndex,
      cells: Children.toArray(row.props.children)
        .filter(isValidElement)
        .map((cell) => ({ className: cell.props.className, content: cell.props.children })),
    }));

  const emptyNode = <Empty description={empty} image={Empty.PRESENTED_IMAGE_SIMPLE} />;

  if (desktop) {
    return (
      <AntTable
        className="table"
        size="middle"
        pagination={false}
        loading={loading}
        dataSource={rows}
        locale={{ emptyText: loading ? ' ' : emptyNode }}
        columns={columns.map((title, index) => ({
          title,
          key: title,
          render: (_, row) => <div className={row.cells[index]?.className}>{row.cells[index]?.content}</div>,
        }))}
      />
    );
  }

  if (loading && !rows.length) {
    return (
      <div className="table table--cards">
        {[1, 2, 3].map((key) => (
          <Card key={key} size="small">
            <Skeleton active paragraph={{ rows: 3 }} />
          </Card>
        ))}
      </div>
    );
  }

  if (!rows.length) return <div className="table__empty">{emptyNode}</div>;

  return (
    <div className={`table table--cards${dense ? ' table--dense' : ''}`}>
      {rows.map((row) => (
        <Card
          key={row.key}
          size="small"
          className="table__card"
          title={primary !== undefined ? <div className="table__card-title">{row.cells[primary]?.content}</div> : undefined}
        >
          <Descriptions
            size="small"
            column={dense ? 2 : 1}
            layout={dense ? 'vertical' : 'horizontal'}
            items={row.cells
              .map((cell, index) => ({ cell, index }))
              .filter(({ cell, index }) => index !== primary && !isEmptyCell(cell.content))
              .map(({ cell, index }) => ({
                key: columns[index],
                label: columns[index],
                children: <div className={cell.className}>{cell.content}</div>,
              }))}
          />
        </Card>
      ))}
    </div>
  );
}
