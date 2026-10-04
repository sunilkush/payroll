import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { filterByFeatures } from '../../utils/roles.js';
import './RoleHome.css';

// Har role ka landing page. Jis module mein `to` hai wo ban chuka hai aur link ho jata hai,
// baaki "Coming soon" dikhte hain.
export default function RoleHome({ title, modules }) {
  const { user, company } = useAuth();

  return (
    <section className="role-home">
      <h1 className="role-home__title">{title}</h1>
      <p className="role-home__welcome">Welcome, {user.name}</p>

      <ul className="role-home__grid">
        {filterByFeatures(modules, company).map((module) => (
          <li key={module.name} className="role-home__card">
            <h2 className="role-home__card-title">{module.name}</h2>
            <p className="role-home__card-text">{module.description}</p>
            {module.to ? (
              <Link to={module.to} className="role-home__link">
                Open &rarr;
              </Link>
            ) : (
              <span className="role-home__badge">Coming soon</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
