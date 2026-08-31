import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { SystemRole } from '../api/types';

export default function RoleRoute({ roles }: { roles: SystemRole[] }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.systemRole)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
