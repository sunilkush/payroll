import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_HOME } from '../utils/roles.js';
import Loader from '../components/Loader/Loader.jsx';

// Ye sirf UI guard hai. Asli permission check backend ke authorize() middleware mein hota hai (Rule 4).
export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  // Khud register kiya hua account: email verify hone tak sirf verify wala page.
  if (user.emailVerified === false) return <Navigate to="/verify-email" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }
  return <Outlet />;
}
