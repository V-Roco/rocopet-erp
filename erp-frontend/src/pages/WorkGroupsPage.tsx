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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', region: '', description: '' });
  const [savingEdit, setSavingEdit] = useState(false);

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

  function startEdit(wg: WorkGroup) {
    setEditingId(wg.id);
    setEditForm({ name: wg.name, region: wg.region ?? '', description: wg.description ?? '' });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(id: string) {
    setSavingEdit(true);
    setError(null);
    try {
      await api.patch(`/work-groups/${id}`, {
        name: editForm.name,
        region: editForm.region || undefined,
        description: editForm.description || undefined,
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setSavingEdit(false);
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {workGroups.map((wg) => {
              const isEditing = editingId === wg.id;
              return (
                <tr key={wg.id}>
                  {isEditing ? (
                    <>
                      <td>
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        />
                      </td>
                      <td>
                        <input
                          value={editForm.region}
                          onChange={(e) => setEditForm((f) => ({ ...f, region: e.target.value }))}
                        />
                      </td>
                      <td>
                        <input
                          value={editForm.description}
                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        />
                      </td>
                      <td>
                        <button className="link-btn" disabled={savingEdit} onClick={() => handleSaveEdit(wg.id)}>
                          {savingEdit ? 'Guardando…' : 'Guardar'}
                        </button>{' '}
                        <button className="link-btn" onClick={cancelEdit}>
                          Cancelar
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{wg.name}</td>
                      <td>{wg.region ?? '—'}</td>
                      <td>{wg.description ?? '—'}</td>
                      <td>
                        <button className="link-btn" onClick={() => startEdit(wg)}>
                          Editar
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {workGroups.length === 0 && (
              <tr>
                <td colSpan={4}>Sin lugares de trabajo todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
