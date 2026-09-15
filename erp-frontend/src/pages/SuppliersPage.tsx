import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import type { Supplier } from '../api/types';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', rut: '', phone: '', email: '', address: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setSuppliers(await api.get<Supplier[]>('/suppliers'));
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
      await api.post('/suppliers', {
        name,
        rut,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
      });
      setName('');
      setRut('');
      setPhone('');
      setEmail('');
      setAddress('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  }

  // RUT se guarda sin guión (ej. "187654327"); el formulario de edición lo
  // necesita con guión, que es el formato que exige la validación del PATCH.
  function formatRut(rut: string) {
    return `${rut.slice(0, -1)}-${rut.slice(-1)}`;
  }

  function startEdit(s: Supplier) {
    setEditingId(s.id);
    setEditForm({
      name: s.name,
      rut: formatRut(s.rut),
      phone: s.phone ?? '',
      email: s.email ?? '',
      address: s.address ?? '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(id: string) {
    setSavingEdit(true);
    setError(null);
    try {
      await api.patch(`/suppliers/${id}`, {
        name: editForm.name,
        rut: editForm.rut,
        phone: editForm.phone || undefined,
        email: editForm.email || undefined,
        address: editForm.address || undefined,
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
      <h1>Proveedores</h1>
      {error && <p className="error">{error}</p>}

      <form className="inline-form wrap" onSubmit={handleCreate}>
        <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="RUT (ej: 12345678-9)" value={rut} onChange={(e) => setRut(e.target.value)} required />
        <input placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Dirección" value={address} onChange={(e) => setAddress(e.target.value)} />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creando…' : '+ Nuevo proveedor'}
        </button>
      </form>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>RUT</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Dirección</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => {
              const isEditing = editingId === s.id;
              return (
                <tr key={s.id}>
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
                          value={editForm.rut}
                          onChange={(e) => setEditForm((f) => ({ ...f, rut: e.target.value }))}
                        />
                      </td>
                      <td>
                        <input
                          value={editForm.phone}
                          onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                        />
                      </td>
                      <td>
                        <input
                          value={editForm.email}
                          onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                        />
                      </td>
                      <td>
                        <input
                          value={editForm.address}
                          onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                        />
                      </td>
                      <td>
                        <button className="link-btn" disabled={savingEdit} onClick={() => handleSaveEdit(s.id)}>
                          {savingEdit ? 'Guardando…' : 'Guardar'}
                        </button>{' '}
                        <button className="link-btn" onClick={cancelEdit}>
                          Cancelar
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{s.name}</td>
                      <td>{s.rut}</td>
                      <td>{s.phone ?? '—'}</td>
                      <td>{s.email ?? '—'}</td>
                      <td>{s.address ?? '—'}</td>
                      <td>
                        <button className="link-btn" onClick={() => startEdit(s)}>
                          Editar
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={6}>Sin proveedores todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
