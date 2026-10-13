import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_HOME } from '../utils/roles.js';
import Loader from '../components/Loader/Loader.jsx';

const BILLING_PATH = '/admin/billing';

// Ye sirf UI guard hai. Asli permission check backend ke authorize() middleware mein hota hai (Rule 4).
export default function ProtectedRoute({ allowedRoles }) {
  const { user, company, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  // Khud register kiya hua account: email verify hone tak sirf verify wala page.
  if (user.emailVerified === false) return <Navigate to="/verify-email" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }
  // Free trial / subscription khatam: admin ke liye sirf Plan & Billing khulta hai (server baaki sab par 402 deta hai).
  if (company?.subscription?.status === 'EXPIRED' && location.pathname !== BILLING_PATH) {
    return <Navigate to={BILLING_PATH} replace />;
  }
  return <Outlet />;
}
