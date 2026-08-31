import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomeRedirect() {
  const { user } = useAuth();
  const target = user?.systemRole === 'EMPLOYEE' ? '/despachos' : '/productos';
  return <Navigate to={target} replace />;
}
