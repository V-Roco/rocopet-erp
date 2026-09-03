import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Product, Purchase, Supplier, WorkGroup } from '../api/types';

interface DraftItem {
  productId: string;
  quantity: string;
  unitCost: string;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [workGroups, setWorkGroups] = useState<WorkGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState('');
  const [workGroupId, setWorkGroupId] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ productId: '', quantity: '1', unitCost: '0' }]);
  const [submitting, setSubmitting] = useState(false);

  const [filterSupplierId, setFilterSupplierId] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  async function load(supplierFilter = filterSupplierId, from = filterFrom, to = filterTo) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (supplierFilter) params.set('supplierId', supplierFilter);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const query = params.toString() ? `?${params.toString()}` : '';
      const [p, prod, sup, wg] = await Promise.all([
        api.get<Purchase[]>(`/purchases${query}`),
        api.get<Product[]>('/products'),
        api.get<Supplier[]>('/suppliers'),
        api.get<WorkGroup[]>('/work-groups'),
      ]);
      setPurchases(p);
      setProducts([...prod].sort((a, b) => a.name.localeCompare(b.name)));
      setSuppliers(sup);
      setWorkGroups(wg);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load('', '', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSupplierFilterChange(value: string) {
    setFilterSupplierId(value);
    load(value, filterFrom, filterTo);
  }

  function handleFromChange(value: string) {
    setFilterFrom(value);
    load(filterSupplierId, value, filterTo);
  }

  function handleToChange(value: string) {
    setFilterTo(value);
    load(filterSupplierId, filterFrom, value);
  }

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItemRow() {
    setItems((prev) => [...prev, { productId: '', quantity: '1', unitCost: '0' }]);
  }

  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/purchases', {
        supplierId,
        workGroupId: workGroupId || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
        })),
      });
      setSupplierId('');
      setWorkGroupId('');
      setItems([{ productId: '', quantity: '1', unitCost: '0' }]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Compras</h1>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Nueva compra</h3>
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
          <option value="">Proveedor…</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={workGroupId} onChange={(e) => setWorkGroupId(e.target.value)}>
          <option value="">Bodega (opcional)…</option>
          {workGroups.map((wg) => (
            <option key={wg.id} value={wg.id}>
              {wg.name}
            </option>
          ))}
        </select>

        {items.map((item, index) => (
          <div className="inline-form" key={index}>
            <select
              value={item.productId}
              onChange={(e) => updateItem(index, { productId: e.target.value })}
              required
            >
              <option value="">Producto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              placeholder="Cantidad"
              value={item.quantity}
              onChange={(e) => updateItem(index, { quantity: e.target.value })}
              required
            />
            <input
              type="number"
              min={0}
              placeholder="Costo unitario (con IVA)"
              value={item.unitCost}
              onChange={(e) => updateItem(index, { unitCost: e.target.value })}
              required
            />
            {items.length > 1 && (
              <button type="button" className="link-btn danger" onClick={() => removeItemRow(index)}>
                Quitar
              </button>
            )}
          </div>
        ))}
        <button type="button" className="link-btn" onClick={addItemRow}>
          + Agregar producto
        </button>
        <div>
          <button type="button" disabled={submitting || !supplierId} onClick={handleCreate}>
            {submitting ? 'Registrando…' : 'Registrar compra'}
          </button>
        </div>
      </div>

      <div className="inline-form">
        <label>
          Filtrar por proveedor{' '}
          <select value={filterSupplierId} onChange={(e) => handleSupplierFilterChange(e.target.value)}>
            <option value="">Todos</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Desde <input type="date" value={filterFrom} onChange={(e) => handleFromChange(e.target.value)} />
        </label>
        <label>
          Hasta <input type="date" value={filterTo} onChange={(e) => handleToChange(e.target.value)} />
        </label>
      </div>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Fecha compra</th>
              <th>Creado el</th>
              <th>Proveedor</th>
              <th>Bodega</th>
              <th>Productos</th>
              <th>Neto</th>
              <th>IVA</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.purchasedAt).toLocaleDateString('es-CL')}</td>
                <td>{new Date(p.createdAt).toLocaleString('es-CL')}</td>
                <td>{p.supplier.name}</td>
                <td>{p.workGroup?.name ?? '—'}</td>
                <td>
                  <ul className="item-list">
                    {p.items.map((i) => (
                      <li key={i.id}>
                        {i.quantity}× {i.product.name} — ${i.unitCost.toLocaleString('es-CL')} c/u = $
                        {i.lineTotal.toLocaleString('es-CL')}
                      </li>
                    ))}
                  </ul>
                </td>
                <td>${p.subtotalNet.toLocaleString('es-CL')}</td>
                <td>${p.ivaAmount.toLocaleString('es-CL')}</td>
                <td>${p.total.toLocaleString('es-CL')}</td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={8}>Sin compras todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
