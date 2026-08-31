import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import type { WorkGroup } from '../api/types';

export default function WorkGroupsPage() {
  const [workGroups, setWorkGroups] = useState<WorkGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setWorkGroups(await api.get<WorkGroup[]>('/work-groups'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/work-groups', { name, region: region || undefined, description: description || undefined });
      setName('');
      setRegion('');
      setDescription('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Lugares de trabajo</h1>
      {error && <p className="error">{error}</p>}

      <form className="inline-form" onSubmit={handleCreate}>
        <input placeholder="Nombre (ej: Bodega Norte)" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Región" value={region} onChange={(e) => setRegion(e.target.value)} />
        <input placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creando…' : '+ Nuevo lugar de trabajo'}
        </button>
      </form>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Región</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {workGroups.map((wg) => (
              <tr key={wg.id}>
                <td>{wg.name}</td>
                <td>{wg.region ?? '—'}</td>
                <td>{wg.description ?? '—'}</td>
              </tr>
            ))}
            {workGroups.length === 0 && (
              <tr>
                <td colSpan={3}>Sin lugares de trabajo todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
