import { useEffect, useState } from 'react';
import { api, API_URL, ApiError } from '../api/client';
import type { Customer, InvoiceType, PaymentStatus, Product, Sale } from '../api/types';
import { PAYMENT_LABELS, INVOICE_STATUS_LABELS, statusClass, invoiceStatusClass } from '../lib/statusLabels';
import { downloadCsv, toCsv } from '../lib/csv';

interface DraftItem {
  productId: string;
  quantity: string;
  unitPrice: string;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ productId: '', quantity: '1', unitPrice: '0' }]);
  const [submitting, setSubmitting] = useState(false);

  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<PaymentStatus | ''>('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editItems, setEditItems] = useState<DraftItem[]>([]);
  const [savingSaleEdit, setSavingSaleEdit] = useState(false);

  const [uploadingInvoiceId, setUploadingInvoiceId] = useState<string | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceFolioDraft, setInvoiceFolioDraft] = useState('');
  const [invoiceTypeDraft, setInvoiceTypeDraft] = useState<InvoiceType | ''>('');
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null);

  async function load(
    customerFilter = filterCustomerId,
    paymentFilter = filterPaymentStatus,
    from = filterFrom,
    to = filterTo,
  ) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (customerFilter) params.set('customerId', customerFilter);
      if (paymentFilter) params.set('paymentStatus', paymentFilter);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const query = params.toString() ? `?${params.toString()}` : '';
      const [s, prod, cust] = await Promise.all([
        api.get<Sale[]>(`/sales${query}`),
        api.get<Product[]>('/products'),
        api.get<Customer[]>('/customers'),
      ]);
      setSales(s);
      setProducts([...prod].sort((a, b) => a.name.localeCompare(b.name)));
      setCustomers(cust);
      // Por defecto quedan todas seleccionadas (el rango de fecha ya las acota).
      setSelectedIds(new Set(s.map((sale) => sale.id)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load('', '', '', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCustomerFilterChange(value: string) {
    setFilterCustomerId(value);
    load(value, filterPaymentStatus, filterFrom, filterTo);
  }

  function handlePaymentFilterChange(value: PaymentStatus | '') {
    setFilterPaymentStatus(value);
    load(filterCustomerId, value, filterFrom, filterTo);
  }

  function handleFromChange(value: string) {
    setFilterFrom(value);
    load(filterCustomerId, filterPaymentStatus, value, filterTo);
  }

  function handleToChange(value: string) {
    setFilterTo(value);
    load(filterCustomerId, filterPaymentStatus, filterFrom, value);
  }

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItemRow() {
    setItems((prev) => [...prev, { productId: '', quantity: '1', unitPrice: '0' }]);
  }

  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/sales', {
        customerId: customerId || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });
      setCustomerId('');
      setItems([{ productId: '', quantity: '1', unitPrice: '0' }]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  }

  function startEditSale(s: Sale) {
    setEditingSaleId(s.id);
    setEditCustomerId(s.customerId ?? '');
    setEditItems(
      s.items.map((i) => ({
        productId: i.productId,
        quantity: String(i.quantity),
        unitPrice: String(i.unitPrice),
      })),
    );
  }

  function cancelEditSale() {
    setEditingSaleId(null);
  }

  function updateEditItem(index: number, patch: Partial<DraftItem>) {
    setEditItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addEditItemRow() {
    setEditItems((prev) => [...prev, { productId: '', quantity: '1', unitPrice: '0' }]);
  }

  function removeEditItemRow(index: number) {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveSaleEdit(id: string) {
    setSavingSaleEdit(true);
    setError(null);
    try {
      await api.patch(`/sales/${id}`, {
        customerId: editCustomerId || undefined,
        items: editItems.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });
      setEditingSaleId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setSavingSaleEdit(false);
    }
  }

  function startUploadInvoice(saleId: string) {
    setUploadingInvoiceId(saleId);
    setInvoiceFile(null);
    setInvoiceFolioDraft('');
    setInvoiceTypeDraft('');
  }

  function cancelUploadInvoice() {
    setUploadingInvoiceId(null);
  }

  async function handleUploadInvoice(saleId: string) {
    if (!invoiceFile) return;
    setSavingInvoice(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('invoice', invoiceFile);
      if (invoiceFolioDraft) form.append('folio', invoiceFolioDraft);
      if (invoiceTypeDraft) form.append('type', invoiceTypeDraft);
      await api.post(`/sales/${saleId}/invoice`, form);
      setUploadingInvoiceId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setSavingInvoice(false);
    }
  }

  async function handleViewInvoice(saleId: string) {
    setViewingInvoiceId(saleId);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/sales/${saleId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      setError('No se pudo abrir la factura');
    } finally {
      setViewingInvoiceId(null);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === sales.length ? new Set() : new Set(sales.map((s) => s.id))));
  }

  // RUT se guarda sin guión (ej. "187654327"); para el CSV se muestra en formato legible.
  function formatRut(rut: string) {
    if (!rut) return '';
    const body = rut.slice(0, -1);
    const dv = rut.slice(-1);
    return `${body}-${dv}`;
  }

  // Exporta solo las ventas marcadas con checkbox, una fila por línea de
  // producto — es el detalle que necesita un RPA para armar cada factura.
  function handleExport() {
    const headers = ['Día', 'RUT', 'Cliente', 'Giro', 'Producto', 'Cantidad', 'Precio unitario', 'Total sin IVA', 'Total con IVA'];

    const selectedSales = sales.filter((s) => selectedIds.has(s.id));
    const rows = selectedSales.flatMap((s) =>
      s.items.map((item) => [
        new Date(s.soldAt).toLocaleDateString('es-CL'),
        s.customer?.rut ? formatRut(s.customer.rut) : '',
        s.customer?.name ?? '',
        s.customer?.giro ?? '',
        item.product.name,
        item.quantity,
        item.unitPrice,
        item.netTotal,
        item.lineTotal,
      ]),
    );

    const csv = toCsv(headers, rows);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`ventas_${stamp}.csv`, csv);
  }

  return (
    <div>
      <h1>Ventas</h1>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Nueva venta</h3>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Sin cliente (boleta anónima)</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
                  {p.name} (stock: {p.quantity})
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
              placeholder="Precio unitario (con IVA)"
              value={item.unitPrice}
              onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
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
          <button
            type="button"
            disabled={submitting || items.some((item) => !item.productId)}
            onClick={handleCreate}
          >
            {submitting ? 'Registrando…' : 'Registrar venta'}
          </button>
        </div>
      </div>

      <div className="inline-form">
        <label>
          Filtrar por cliente{' '}
          <select value={filterCustomerId} onChange={(e) => handleCustomerFilterChange(e.target.value)}>
            <option value="">Todos</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Filtrar por pago{' '}
          <select
            value={filterPaymentStatus}
            onChange={(e) => handlePaymentFilterChange(e.target.value as PaymentStatus | '')}
          >
            <option value="">Todos</option>
            {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
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
        <button type="button" disabled={selectedIds.size === 0} onClick={handleExport}>
          Exportar CSV ({selectedIds.size})
        </button>
      </div>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={sales.length > 0 && selectedIds.size === sales.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>Fecha venta</th>
              <th>Creado el</th>
              <th>Cliente</th>
              <th>Productos</th>
              <th>Total</th>
              <th>Pago</th>
              <th>Factura</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => {
              const isEditing = editingSaleId === s.id;
              const canEditSale = !s.dispatch || s.dispatch.paymentStatus === 'NOT_PAID';
              return (
                <tr key={s.id}>
                  <td>
                    <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelected(s.id)} />
                  </td>
                  <td>{new Date(s.soldAt).toLocaleDateString('es-CL')}</td>
                  <td>{new Date(s.createdAt).toLocaleString('es-CL')}</td>
                  <td>
                    {isEditing ? (
                      <select value={editCustomerId} onChange={(e) => setEditCustomerId(e.target.value)}>
                        <option value="">Sin cliente (boleta anónima)</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      s.customer?.name ?? 'Cliente anónimo'
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
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
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
                              value={item.unitPrice}
                              onChange={(e) => updateEditItem(index, { unitPrice: e.target.value })}
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
                        {s.items.map((i) => (
                          <li key={i.id}>
                            {i.quantity}× {i.product.name} — ${i.unitPrice.toLocaleString('es-CL')} c/u = $
                            {i.lineTotal.toLocaleString('es-CL')}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>${s.total.toLocaleString('es-CL')}</td>
                  <td>
                    {s.dispatch ? (
                      <span className={`status-badge ${statusClass(s.dispatch.paymentStatus)}`}>
                        {PAYMENT_LABELS[s.dispatch.paymentStatus]}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${invoiceStatusClass(s.invoiceStatus)}`}>
                      {INVOICE_STATUS_LABELS[s.invoiceStatus]}
                      {s.invoiceFolio ? ` #${s.invoiceFolio}` : ''}
                    </span>
                    <div>
                      {s.invoiceUrl && (
                        <button
                          type="button"
                          className="link-btn"
                          disabled={viewingInvoiceId === s.id}
                          onClick={() => handleViewInvoice(s.id)}
                        >
                          {viewingInvoiceId === s.id ? 'Abriendo…' : 'Ver factura'}
                        </button>
                      )}
                      {!s.invoiceUrl &&
                        (uploadingInvoiceId === s.id ? (
                          <div className="payment-form">
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
                            />
                            <input
                              placeholder="N° folio"
                              value={invoiceFolioDraft}
                              onChange={(e) => setInvoiceFolioDraft(e.target.value)}
                            />
                            <select
                              value={invoiceTypeDraft}
                              onChange={(e) => setInvoiceTypeDraft(e.target.value as InvoiceType | '')}
                            >
                              <option value="">Tipo…</option>
                              <option value="BOLETA">Boleta</option>
                              <option value="FACTURA">Factura</option>
                            </select>
                            <button
                              type="button"
                              disabled={!invoiceFile || savingInvoice}
                              onClick={() => handleUploadInvoice(s.id)}
                            >
                              {savingInvoice ? 'Subiendo…' : 'Guardar'}
                            </button>
                            <button type="button" className="link-btn" onClick={cancelUploadInvoice}>
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button type="button" className="link-btn" onClick={() => startUploadInvoice(s.id)}>
                            Subir factura
                          </button>
                        ))}
                    </div>
                  </td>
                  <td>
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="link-btn"
                          disabled={savingSaleEdit || editItems.some((item) => !item.productId)}
                          onClick={() => handleSaveSaleEdit(s.id)}
                        >
                          {savingSaleEdit ? 'Guardando…' : 'Guardar'}
                        </button>{' '}
                        <button type="button" className="link-btn" onClick={cancelEditSale}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      canEditSale && (
                        <button type="button" className="link-btn" onClick={() => startEditSale(s)}>
                          Editar
                        </button>
                      )
                    )}
                  </td>
                </tr>
              );
            })}
            {sales.length === 0 && (
              <tr>
                <td colSpan={9}>Sin ventas todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
