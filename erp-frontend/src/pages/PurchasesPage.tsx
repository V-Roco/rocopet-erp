import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Product, Purchase, Supplier, WorkGroup } from '../api/types';

interface DraftItem {
  productId: string;
  quantity: string;
  unitCost: string;
}

// El costo se guarda y se manda al backend siempre CON IVA (así lo espera
// la API), pero como algunos proveedores cotizan neto y otros con IVA, se
// muestran los dos campos enlazados: escribir en uno recalcula el otro.
function grossFromNet(net: string) {
  const n = Number(net);
  if (!n) return '0';
  return String(Math.round(n * 1.19));
}

function netFromGross(gross: string) {
  const g = Number(gross);
  if (!g) return '0';
  return String(Math.round(g / 1.19));
}

function emptyItem(): DraftItem {
  return { productId: '', quantity: '1', unitCost: '0' };
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
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);

  const [filterSupplierId, setFilterSupplierId] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSupplierId, setEditSupplierId] = useState('');
  const [editWorkGroupId, setEditWorkGroupId] = useState('');
  const [editItems, setEditItems] = useState<DraftItem[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

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
    setItems((prev) => [...prev, emptyItem()]);
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
      setItems([emptyItem()]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(p: Purchase) {
    setEditingId(p.id);
    setEditSupplierId(p.supplier.id);
    setEditWorkGroupId(p.workGroup?.id ?? '');
    setEditItems(
      p.items.map((i) => ({
        productId: i.product.id,
        quantity: String(i.quantity),
        unitCost: String(i.unitCost),
      })),
    );
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function updateEditItem(index: number, patch: Partial<DraftItem>) {
    setEditItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addEditItemRow() {
    setEditItems((prev) => [...prev, emptyItem()]);
  }

  function removeEditItemRow(index: number) {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveEdit(id: string) {
    setSavingEdit(true);
    setError(null);
    try {
      await api.patch(`/purchases/${id}`, {
        supplierId: editSupplierId,
        workGroupId: editWorkGroupId || undefined,
        items: editItems.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
        })),
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
              placeholder="Costo unitario sin IVA"
              value={netFromGross(item.unitCost)}
              onChange={(e) => updateItem(index, { unitCost: grossFromNet(e.target.value) })}
              required
            />
            <input
              type="number"
              min={0}
              placeholder="Costo unitario con IVA"
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => {
              const isEditing = editingId === p.id;
              return (
                <tr key={p.id}>
                  <td>{new Date(p.purchasedAt).toLocaleDateString('es-CL')}</td>
                  <td>{new Date(p.createdAt).toLocaleString('es-CL')}</td>
                  <td>
                    {isEditing ? (
                      <select value={editSupplierId} onChange={(e) => setEditSupplierId(e.target.value)}>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      p.supplier.name
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select value={editWorkGroupId} onChange={(e) => setEditWorkGroupId(e.target.value)}>
                        <option value="">Bodega (opcional)…</option>
                        {workGroups.map((wg) => (
                          <option key={wg.id} value={wg.id}>
                            {wg.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      p.workGroup?.name ?? '—'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <>
                        {editItems.map((item, index) => (
                          <div className="inline-form" key={index}>
                            <select
                              value={item.productId}
                              onChange={(e) => updateEditItem(index, { productId: e.target.value })}
                            >
                              <option value="">Producto…</option>
                              {products.map((prod) => (
                                <option key={prod.id} value={prod.id}>
                                  {prod.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => updateEditItem(index, { quantity: e.target.value })}
                            />
                            <input
                              type="number"
                              min={0}
                              placeholder="Sin IVA"
                              value={netFromGross(item.unitCost)}
                              onChange={(e) => updateEditItem(index, { unitCost: grossFromNet(e.target.value) })}
                            />
                            <input
                              type="number"
                              min={0}
                              placeholder="Con IVA"
                              value={item.unitCost}
                              onChange={(e) => updateEditItem(index, { unitCost: e.target.value })}
                            />
                            {editItems.length > 1 && (
                              <button
                                type="button"
                                className="link-btn danger"
                                onClick={() => removeEditItemRow(index)}
                              >
                                Quitar
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" className="link-btn" onClick={addEditItemRow}>
                          + Agregar producto
                        </button>
                      </>
                    ) : (
                      <ul className="item-list">
                        {p.items.map((i) => (
                          <li key={i.id}>
                            {i.quantity}× {i.product.name} — ${i.unitCost.toLocaleString('es-CL')} c/u = $
                            {i.lineTotal.toLocaleString('es-CL')}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>${p.subtotalNet.toLocaleString('es-CL')}</td>
                  <td>${p.ivaAmount.toLocaleString('es-CL')}</td>
                  <td>${p.total.toLocaleString('es-CL')}</td>
                  <td>
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="link-btn"
                          disabled={savingEdit || editItems.some((item) => !item.productId)}
                          onClick={() => handleSaveEdit(p.id)}
                        >
                          {savingEdit ? 'Guardando…' : 'Guardar'}
                        </button>{' '}
                        <button type="button" className="link-btn" onClick={cancelEdit}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button type="button" className="link-btn" onClick={() => startEdit(p)}>
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={9}>Sin compras todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
