import { useEffect, useState, type FormEvent } from 'react';
import { api, API_URL, ApiError } from '../api/client';
import type { Product } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { compressImage } from '../lib/image';

export default function ProductsPage() {
  const { user } = useAuth();
  const canManage = user?.systemRole === 'ADMIN' || user?.systemRole === 'PARTNER';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [minStockDrafts, setMinStockDrafts] = useState<Record<string, string>>({});
  const [savingMinStock, setSavingMinStock] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editImage, setEditImage] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'qty-asc' | 'qty-desc'>('name-asc');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

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
      form.append('minStock', minStock);
      if (image) form.append('image', await compressImage(image));
      await api.post('/products', form);
      setName('');
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

  function startEdit(p: Product) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditImage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditImage(null);
  }

  async function handleSaveEdit(id: string) {
    setSavingEdit(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('name', editName);
      if (editImage) form.append('image', await compressImage(editImage));
      await api.patch(`/products/${id}`, form);
      setEditingId(null);
      setEditImage(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setSavingEdit(false);
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

  const visibleProducts = products
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => !onlyLowStock || p.quantity <= p.minStock)
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'qty-asc':
          return a.quantity - b.quantity;
        case 'qty-desc':
          return b.quantity - a.quantity;
      }
    });

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
        <form className="inline-form wrap" onSubmit={handleCreate}>
          <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
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
          <p className="muted" style={{ width: '100%', margin: 0 }}>
            El producto se crea con 0 unidades — el stock entra al registrar una compra en "Compras".
          </p>
        </form>
      )}

      <div className="inline-form">
        <input
          placeholder="Buscar por nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label>
          Ordenar por{' '}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
            <option value="name-asc">Nombre (A-Z)</option>
            <option value="name-desc">Nombre (Z-A)</option>
            <option value="qty-desc">Cantidad (mayor a menor)</option>
            <option value="qty-asc">Cantidad (menor a mayor)</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={onlyLowStock} onChange={(e) => setOnlyLowStock(e.target.checked)} />{' '}
          Solo stock bajo
        </label>
      </div>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <table className="products-table">
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
            {visibleProducts.map((p) => {
              const lowStock = p.quantity <= p.minStock;
              const isEditing = editingId === p.id;
              return (
                <tr key={p.id} className={lowStock ? 'status-red' : ''}>
                  <td>
                    {p.imageUrl ? (
                      <img className="thumb" src={`${API_URL}${p.imageUrl}`} alt={p.name} />
                    ) : (
                      <div className="thumb placeholder" />
                    )}
                    {isEditing && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setEditImage(e.target.files?.[0] ?? null)}
                      />
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    ) : (
                      p.name
                    )}
                  </td>
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
                      {isEditing ? (
                        <>
                          <button
                            className="link-btn"
                            disabled={savingEdit}
                            onClick={() => handleSaveEdit(p.id)}
                          >
                            {savingEdit ? 'Guardando…' : 'Guardar'}
                          </button>{' '}
                          <button className="link-btn" onClick={cancelEdit}>
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="link-btn" onClick={() => startEdit(p)}>
                            Editar
                          </button>{' '}
                          <button className="link-btn danger" onClick={() => handleDelete(p.id)}>
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {visibleProducts.length === 0 && (
              <tr>
                <td colSpan={canManage ? 6 : 5}>
                  {products.length === 0 ? 'Sin productos todavía.' : 'Ningún producto coincide con el filtro.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
