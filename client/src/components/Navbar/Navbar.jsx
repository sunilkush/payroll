import { MenuOutlined } from '@ant-design/icons';
import { Button, Layout } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_HOME, ROLE_LABEL } from '../../utils/roles.js';
import './Navbar.css';

// Upar ki patti. showMenuButton (mobile/tablet) par hamburger drawer kholta hai (onMenuClick);
// desktop par menu sidebar mein hota hai.
export default function Navbar({ showMenuButton, onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Layout.Header className="navbar">
      {showMenuButton && (
        <Button
          type="text"
          className="navbar__menu"
          aria-label="Menu kholein"
          icon={<MenuOutlined />}
          onClick={onMenuClick}
        />
      )}
      <Link to={ROLE_HOME[user.role]} className="navbar__brand">
        Payroll
      </Link>
      <div className="navbar__user">
        <div className="navbar__identity">
          <span className="navbar__name">{user.name}</span>
          <span className="navbar__role">{ROLE_LABEL[user.role]}</span>
        </div>
        <Button danger size="small" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </Layout.Header>
  );
}
