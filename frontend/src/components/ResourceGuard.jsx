import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { canAccess } from '../lib/permissions.js';

// Wraps an individual route's element (used inside the already-authenticated
// SidebarLayout routes) and redirects to /dashboard if the current role has
// no access to the given RBAC matrix resource ('fleet', 'drivers', 'trips',
// 'fuelExp', 'analytics'). Assumes ProtectedRoute has already confirmed login.
export default function ResourceGuard({ resource, children }) {
  const { role } = useAuth();
  if (!canAccess(role, resource)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
