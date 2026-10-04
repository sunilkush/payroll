import { Link } from 'react-router-dom';
import './PageHeader.css';

// Page ka title + (optional) back link, subtitle aur right side ke actions.
export default function PageHeader({ title, subtitle, back, children }) {
  return (
    <header className="page-header">
      {back && (
        <Link to={back.to} className="page-header__back">
          &larr; {back.label}
        </Link>
      )}
      <div className="page-header__row">
        <div>
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
        {children && <div className="page-header__actions">{children}</div>}
      </div>
    </header>
  );
}
