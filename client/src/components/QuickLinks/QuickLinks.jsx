import { useAuth } from '../../context/AuthContext.jsx';
import { filterByFeatures } from '../../utils/roles.js';
import ListCard, { ListRow } from '../ListCard/ListCard.jsx';

// Dashboard ke "kahan jaana hai" links. items: [{ name, description, to, icon, feature }]
// feature (jaise 'leaveEnabled') band ho to wo link nahi dikhta.
export default function QuickLinks({ items }) {
  const { company } = useAuth();

  return (
    <ListCard title="Quick links">
      {filterByFeatures(items, company).map((item) => (
        <ListRow key={item.to} icon={item.icon} title={item.name} meta={item.description} to={item.to} />
      ))}
    </ListCard>
  );
}
