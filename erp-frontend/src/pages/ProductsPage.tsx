import { useEffect, useState, type FormEvent } from 'react';
import { api, API_URL, ApiError } from '../api/client';
import type { Product } from '../api/types';
import { useAuth } from '../context/AuthContext';

export default function ProductsPage() {
  const { user } = useAuth();
  const canManage = user?.systemRole === 'ADMIN' || user?.systemRole === 'PARTNER';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [minStock, setMinStock] = useState('5');
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [minStockDrafts, setMinStockDrafts] = useState<Record<string, string>>({});
  const [savingMinStock, setSavingMinStock] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<Product[]>('/products');
      setProducts(data);
      setMinStockDrafts(Object.fromEntries(data.map((p) => [p.id, String(p.minStock)])));
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
      const form = new FormData();
      form.append('name', name);
      form.append('quantity', quantity);
      form.append('minStock', minStock);
      if (image) form.append('image', image);
      await api.post('/products', form);
      setName('');
      setQuantity('0');
      setMinStock('5');
      setImage(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveMinStock(id: string) {
    setSavingMinStock(id);
    setError(null);
    try {
      const form = new FormData();
      form.append('minStock', minStockDrafts[id] ?? '0');
      await api.patch(`/products/${id}`, form);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setSavingMinStock(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await api.delete(`/products/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }

  const lowStockCount = products.filter((p) => p.quantity <= p.minStock).length;

  return (
    <div>
      <h1>Inventario</h1>
      {error && <p className="error">{error}</p>}
      {lowStockCount > 0 && (
        <p className="status-badge status-red">
          {lowStockCount} producto{lowStockCount === 1 ? '' : 's'} con stock bajo
        </p>
      )}

      {canManage && (
        <form className="inline-form" onSubmit={handleCreate}>
          <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
          <input
            type="number"
            min={0}
            placeholder="Cantidad"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
          <input
            type="number"
            min={0}
            placeholder="Stock mínimo"
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
          />
          <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Creando…' : '+ Nuevo producto'}
          </button>
        </form>
      )}

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Nombre</th>
              <th>Cantidad</th>
              <th>Stock mínimo</th>
              <th></th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const lowStock = p.quantity <= p.minStock;
              return (
                <tr key={p.id} className={lowStock ? 'status-red' : ''}>
                  <td>
                    {p.imageUrl ? (
                      <img className="thumb" src={`${API_URL}${p.imageUrl}`} alt={p.name} />
                    ) : (
                      <div className="thumb placeholder" />
                    )}
                  </td>
                  <td>{p.name}</td>
                  <td>{p.quantity}</td>
                  <td>
                    {canManage ? (
                      <div className="dispatch-item-controls">
                        <input
                          type="number"
                          min={0}
                          value={minStockDrafts[p.id] ?? String(p.minStock)}
                          onChange={(e) =>
                            setMinStockDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                        />
                        <button
                          type="button"
                          className="link-btn"
                          disabled={savingMinStock === p.id}
                          onClick={() => handleSaveMinStock(p.id)}
                        >
                          {savingMinStock === p.id ? '…' : 'Guardar'}
                        </button>
                      </div>
                    ) : (
                      p.minStock
                    )}
                  </td>
                  <td>{lowStock && <span className="status-badge status-red">Stock bajo</span>}</td>
                  {canManage && (
                    <td>
                      <button className="link-btn danger" onClick={() => handleDelete(p.id)}>
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={canManage ? 6 : 5}>Sin productos todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
