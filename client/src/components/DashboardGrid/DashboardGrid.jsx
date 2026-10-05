import './DashboardGrid.css';

// Dashboard ki ek line: bada panel (chart / table) + chhota panel (list / donut).
// Mobile/tablet: ek ke neeche ek. Desktop: 2/3 + 1/3. `side` na ho to bada panel poori chaudai leta hai.
export default function DashboardRow({ main, side }) {
  return (
    <div className={`dashboard-row${side ? '' : ' dashboard-row--full'}`}>
      <div className="dashboard-row__main">{main}</div>
      {side && <div className="dashboard-row__side">{side}</div>}
    </div>
  );
}
