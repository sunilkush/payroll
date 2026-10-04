import { Children, cloneElement, isValidElement } from 'react';
import './Table.css';

// Usage: <Table columns={['Name', 'Email']} empty="Koi record nahi">{rows}</Table>
// rows = <tr> jinke andar seedhe <td> hon, columns ke order mein.
//
// Mobile (768px se chhoti screen) par har row ek card ban jati hai aur har value ke saath uske
// column ka naam dikhta hai. Iske liye yahan har <td> par data-label lagta hai, pages ko kuch nahi karna.
// dense: card mein values 2 column mein (lambi lists ke liye, jaise mahine ki attendance).
export default function Table({ columns, empty = 'Koi record nahi mila.', dense = false, children }) {
  const rows = Children.toArray(children).filter(isValidElement);

  const labelled = rows.map((row) =>
    cloneElement(
      row,
      undefined,
      Children.map(row.props.children, (cell, index) =>
        isValidElement(cell)
          ? cloneElement(
              cell,
              { 'data-label': columns[index] },
              <div className="table__value">{cell.props.children}</div>
            )
          : cell
      )
    )
  );

  return (
    <div className={`table${dense ? ' table--dense' : ''}`}>
      <table className="table__grid">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labelled.length ? (
            labelled
          ) : (
            <tr className="table__empty-row">
              <td className="table__empty" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
