import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import type { Customer } from '../api/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [giro, setGiro] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    rut: '',
    giro: '',
    phone: '',
    email: '',
    address: '',
    businessHours: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setCustomers(await api.get<Customer[]>('/customers'));
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
      await api.post('/customers', {
        name,
        rut,
        giro: giro || undefined,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        businessHours: businessHours || undefined,
      });
      setName('');
      setRut('');
      setGiro('');
      setPhone('');
      setEmail('');
      setAddress('');
      setBusinessHours('');
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

  function startEdit(c: Customer) {
    setEditingId(c.id);
    setEditForm({
      name: c.name,
      rut: formatRut(c.rut),
      giro: c.giro ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
      businessHours: c.businessHours ?? '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(id: string) {
    setSavingEdit(true);
    setError(null);
    try {
      await api.patch(`/customers/${id}`, {
        name: editForm.name,
        rut: editForm.rut,
        giro: editForm.giro || undefined,
        phone: editForm.phone || undefined,
        email: editForm.email || undefined,
        address: editForm.address || undefined,
        businessHours: editForm.businessHours || undefined,
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
      <h1>Clientes</h1>
      {error && <p className="error">{error}</p>}

      <form className="inline-form wrap" onSubmit={handleCreate}>
        <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="RUT (ej: 12345678-9)" value={rut} onChange={(e) => setRut(e.target.value)} required />
        <input
          placeholder="Giro (para factura)"
          value={giro}
          onChange={(e) => setGiro(e.target.value)}
        />
        <input placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Dirección" value={address} onChange={(e) => setAddress(e.target.value)} />
        <input
          placeholder="Horario de atención"
          value={businessHours}
          onChange={(e) => setBusinessHours(e.target.value)}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creando…' : '+ Nuevo cliente'}
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
              <th>Giro</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Dirección</th>
              <th>Horario de atención</th>
              <th>Coordenadas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const isEditing = editingId === c.id;
              return (
                <tr key={c.id}>
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
                          value={editForm.giro}
                          onChange={(e) => setEditForm((f) => ({ ...f, giro: e.target.value }))}
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
                        <input
                          value={editForm.businessHours}
                          onChange={(e) => setEditForm((f) => ({ ...f, businessHours: e.target.value }))}
                        />
                      </td>
                      <td>{c.latitude && c.longitude ? `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}` : '—'}</td>
                      <td>
                        <button className="link-btn" disabled={savingEdit} onClick={() => handleSaveEdit(c.id)}>
                          {savingEdit ? 'Guardando…' : 'Guardar'}
                        </button>{' '}
                        <button className="link-btn" onClick={cancelEdit}>
                          Cancelar
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{c.name}</td>
                      <td>{c.rut}</td>
                      <td>{c.giro ?? '—'}</td>
                      <td>{c.phone ?? '—'}</td>
                      <td>{c.email ?? '—'}</td>
                      <td>{c.address ?? '—'}</td>
                      <td>{c.businessHours ?? '—'}</td>
                      <td>{c.latitude && c.longitude ? `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}` : '—'}</td>
                      <td>
                        <button className="link-btn" onClick={() => startEdit(c)}>
                          Editar
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {customers.length === 0 && (
              <tr>
                <td colSpan={9}>Sin clientes todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
