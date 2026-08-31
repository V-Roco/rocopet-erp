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
              <th>Dirección</th>
              <th>Coordenadas</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.rut}</td>
                <td>{c.giro ?? '—'}</td>
                <td>{c.address ?? '—'}</td>
                <td>{c.latitude && c.longitude ? `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}` : '—'}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={5}>Sin clientes todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
