import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_HOME, ROLE_LABEL } from '../../utils/roles.js';
import './Navbar.css';

// Upar ki patti. Mobile/tablet par hamburger button drawer kholta hai (onMenuClick);
// desktop par menu sidebar mein hota hai aur hamburger chhup jata hai.
export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="navbar">
      <button type="button" className="navbar__menu" aria-label="Menu kholein" onClick={onMenuClick}>
        <span className="navbar__menu-icon" />
      </button>
      <Link to={ROLE_HOME[user.role]} className="navbar__brand">
        Payroll
      </Link>
      <div className="navbar__user">
        <div className="navbar__identity">
          <span className="navbar__name">{user.name}</span>
          <span className="navbar__role">{ROLE_LABEL[user.role]}</span>
        </div>
        <button type="button" className="navbar__logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
