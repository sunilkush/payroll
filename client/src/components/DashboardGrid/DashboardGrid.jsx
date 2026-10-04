import './DashboardGrid.css';

// Dashboard ke neeche ke do dabbe. Mobile/tablet: ek ke neeche ek. Desktop: saath-saath.
export default function DashboardGrid({ children }) {
  return <div className="dashboard-grid">{children}</div>;
}
