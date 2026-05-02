export default function RoleGate({ allowedRoles = [], role, children, fallback = null }) {
  if (!allowedRoles.includes(role)) return fallback;
  return children;
}
