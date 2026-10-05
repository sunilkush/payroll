import { Link } from 'react-router-dom';
import { usePageDetail } from '../../context/PageDetailContext.jsx';
import './PageHeader.css';

// Page ke upar ki patti: (optional) back link, ek line ka parichay (subtitle) aur daayein actions.
//
// Bada title yahan NAHI dikhta: page ka naam top bar mein hai, do baar dikhana dohrav hai.
//   title   screen reader ke liye chhupa hua heading (aur tests ke liye) - hamesha do
//   detail  true ho to title top bar ke breadcrumb mein dikhta hai. Detail pages ke liye, jahan title
//           koi khaas naam hai (company ka naam, staff ka naam, "Add Staff").
export default function PageHeader({ title, subtitle, back, detail = false, children }) {
  usePageDetail(detail ? title : '');
  const hasRow = Boolean(subtitle || children);

  return (
    <header className={`page-header${back || hasRow ? '' : ' page-header--empty'}`}>
      <h1 className="visually-hidden">{title}</h1>
      {back && (
        <Link to={back.to} className="page-header__back">
          &larr; {back.label}
        </Link>
      )}
      {hasRow && (
        <div className="page-header__row">
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
          {children && <div className="page-header__actions">{children}</div>}
        </div>
      )}
    </header>
  );
}
