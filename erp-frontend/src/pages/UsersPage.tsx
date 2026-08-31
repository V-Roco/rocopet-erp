import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import type { SystemRole, UserProfile, WorkGroup } from '../api/types';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS: Record<SystemRole, string> = {
  ADMIN: 'Administrador',
  PARTNER: 'Socio',
  EMPLOYEE: 'Trabajador',
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const canCreate = currentUser?.systemRole === 'ADMIN';

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [workGroups, setWorkGroups] = useState<WorkGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [rut, setRut] = useState('');
  const [pin, setPin] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<SystemRole>('EMPLOYEE');
  const [selectedWorkGroups, setSelectedWorkGroups] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [u, wg] = await Promise.all([
        api.get<UserProfile[]>('/users'),
        api.get<WorkGroup[]>('/work-groups'),
      ]);
      setUsers(u);
      setWorkGroups(wg);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleWorkGroup(id: string) {
    setSelectedWorkGroups((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/users', {
        email,
        rut,
        pin,
        fullName: fullName || undefined,
        systemRole: role,
        workGroupIds: selectedWorkGroups,
      });
      setEmail('');
      setRut('');
      setPin('');
      setFullName('');
      setRole('EMPLOYEE');
      setSelectedWorkGroups([]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(u: UserProfile) {
    try {
      await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }

  return (
    <div>
      <h1>Perfiles</h1>
      {error && <p className="error">{error}</p>}

      {canCreate && (
        <form className="card" onSubmit={handleCreate}>
          <h3>Nuevo perfil</h3>
          <div className="inline-form wrap">
            <input placeholder="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input placeholder="RUT (ej: 12345678-9)" value={rut} onChange={(e) => setRut(e.target.value)} required />
            <input placeholder="PIN (4 dígitos)" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={4} required />
            <input placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <select value={role} onChange={(e) => setRole(e.target.value as SystemRole)}>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="checkbox-group">
            {workGroups.map((wg) => (
              <label key={wg.id}>
                <input
                  type="checkbox"
                  checked={selectedWorkGroups.includes(wg.id)}
                  onChange={() => toggleWorkGroup(wg.id)}
                />
                {wg.name}
              </label>
            ))}
          </div>
          <button type="submit" disabled={submitting || selectedWorkGroups.length === 0}>
            {submitting ? 'Creando…' : '+ Crear perfil'}
          </button>
        </form>
      )}

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Lugares de trabajo</th>
              <th>Estado</th>
              {canCreate && <th></th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName ?? '—'}</td>
                <td>{u.email}</td>
                <td>{ROLE_LABELS[u.systemRole]}</td>
                <td>{u.workGroups.map((wg) => wg.name).join(', ') || '—'}</td>
                <td>{u.isActive ? 'Activo' : 'Desactivado'}</td>
                {canCreate && (
                  <td>
                    <button className="link-btn" onClick={() => toggleActive(u)}>
                      {u.isActive ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
