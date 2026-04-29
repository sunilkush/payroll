import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
export default function RoleRoute({ allowedRoles = [] }) {
  const role = useSelector((s) => s.auth.user?.role);
  return allowedRoles.includes(role) ? (
    <Outlet />
  ) : (
    <Navigate to="/app/dashboard" replace />
  );
}
