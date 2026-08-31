import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { SystemRole } from '../api/types';

interface NavItem {
  to: string;
  label: string;
  roles: SystemRole[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/productos', label: 'Inventario', roles: ['ADMIN', 'PARTNER', 'EMPLOYEE'] },
  { to: '/proveedores', label: 'Proveedores', roles: ['ADMIN', 'PARTNER'] },
  { to: '/compras', label: 'Compras', roles: ['ADMIN', 'PARTNER'] },
  { to: '/clientes', label: 'Clientes', roles: ['ADMIN', 'PARTNER'] },
  { to: '/ventas', label: 'Ventas', roles: ['ADMIN', 'PARTNER'] },
  { to: '/cuentas-por-cobrar', label: 'Cuentas por cobrar', roles: ['ADMIN', 'PARTNER'] },
  { to: '/graficos', label: 'Gráficos', roles: ['ADMIN', 'PARTNER'] },
  { to: '/despachos', label: 'Despachos', roles: ['ADMIN', 'PARTNER', 'EMPLOYEE'] },
  { to: '/calendario', label: 'Calendario', roles: ['ADMIN', 'PARTNER', 'EMPLOYEE'] },
  { to: '/lugares-trabajo', label: 'Lugares de trabajo', roles: ['ADMIN', 'PARTNER'] },
  { to: '/perfiles', label: 'Perfiles', roles: ['ADMIN', 'PARTNER'] },
];

const ROLE_LABELS: Record<SystemRole, string> = {
  ADMIN: 'Administrador',
  PARTNER: 'Socio',
  EMPLOYEE: 'Trabajador',
};

export default function Layout() {
  const { user, logout, activeWorkGroupId, setActiveWorkGroupId } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const items = NAV_ITEMS.filter((item) => user && item.roles.includes(user.systemRole));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Rocopet ERP</div>
        <nav>
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="user-box">
          <div className="user-name">{user?.fullName ?? user?.email}</div>
          <div className="user-role">{user && ROLE_LABELS[user.systemRole]}</div>

          {user && user.workGroups.length > 1 ? (
            <label className="work-group-picker">
              Lugar de trabajo
              <select value={activeWorkGroupId ?? ''} onChange={(e) => setActiveWorkGroupId(e.target.value)}>
                {user.workGroups.map((wg) => (
                  <option key={wg.id} value={wg.id}>
                    {wg.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            user &&
            user.workGroups.length === 1 && (
              <div className="work-group-single">{user.workGroups[0].name}</div>
            )
          )}

          <button onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
