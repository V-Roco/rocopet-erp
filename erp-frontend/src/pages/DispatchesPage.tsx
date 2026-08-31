import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Dispatch, DispatchItem, DeliveryStatus, PaymentStatus, PaymentMethod } from '../api/types';
import { DELIVERY_LABELS, PAYMENT_LABELS, METHOD_LABELS, statusClass } from '../lib/statusLabels';

interface PaymentDraft {
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paidAmount: string;
  checkDueDate: string;
}

function draftFrom(d: Dispatch): PaymentDraft {
  return {
    paymentStatus: d.paymentStatus,
    paymentMethod: d.paymentMethod ?? 'CASH',
    paidAmount: String(d.paidAmount || ''),
    checkDueDate: d.checkDueDate ? d.checkDueDate.slice(0, 10) : '',
  };
}

interface ItemDraft {
  deliveredQuantity: string;
  notes: string;
}

function itemDraftFrom(item: DispatchItem): ItemDraft {
  return { deliveredQuantity: String(item.deliveredQuantity), notes: item.notes ?? '' };
}

export default function DispatchesPage() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryStatus | ''>('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, PaymentDraft>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [itemDrafts, setItemDrafts] = useState<Record<string, ItemDraft>>({});
  const [savingItem, setSavingItem] = useState<string | null>(null);

  async function load(delivery = deliveryFilter, payment = paymentFilter) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (delivery) params.set('deliveryStatus', delivery);
      if (payment) params.set('paymentStatus', payment);
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await api.get<Dispatch[]>(`/dispatches${query}`);
      setDispatches(data);
      setDrafts(Object.fromEntries(data.map((d) => [d.id, draftFrom(d)])));
      setItemDrafts(
        Object.fromEntries(data.flatMap((d) => d.items.map((item) => [item.id, itemDraftFrom(item)]))),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load('', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDeliveryFilterChange(value: DeliveryStatus | '') {
    setDeliveryFilter(value);
    load(value, paymentFilter);
  }

  function handlePaymentFilterChange(value: PaymentStatus | '') {
    setPaymentFilter(value);
    load(deliveryFilter, value);
  }

  async function updateDelivery(id: string, deliveryStatus: DeliveryStatus) {
    setError(null);
    try {
      await api.patch(`/dispatches/${id}`, { deliveryStatus });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }

  function updateDraft(id: string, patch: Partial<PaymentDraft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function savePayment(id: string) {
    const draft = drafts[id];
    setSaving(id);
    setError(null);
    try {
      const body: Record<string, unknown> = { paymentStatus: draft.paymentStatus };
      if (draft.paymentStatus !== 'NOT_PAID') {
        body.paymentMethod = draft.paymentMethod;
        body.paidAmount = Number(draft.paidAmount || 0);
        if (draft.paymentMethod === 'CHECK' && draft.checkDueDate) {
          body.checkDueDate = draft.checkDueDate;
        }
      }
      await api.patch(`/dispatches/${id}`, body);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setSaving(null);
    }
  }

  function updateItemDraft(itemId: string, patch: Partial<ItemDraft>) {
    setItemDrafts((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
  }

  async function saveItem(dispatchId: string, itemId: string) {
    const draft = itemDrafts[itemId];
    setSavingItem(itemId);
    setError(null);
    try {
      await api.patch(`/dispatches/${dispatchId}/items/${itemId}`, {
        deliveredQuantity: Number(draft.deliveredQuantity || 0),
        notes: draft.notes || undefined,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setSavingItem(null);
    }
  }

  return (
    <div>
      <h1>Despachos</h1>
      {error && <p className="error">{error}</p>}

      <div className="inline-form">
        <label>
          Filtrar por entrega{' '}
          <select
            value={deliveryFilter}
            onChange={(e) => handleDeliveryFilterChange(e.target.value as DeliveryStatus | '')}
          >
            <option value="">Todos</option>
            {Object.entries(DELIVERY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Filtrar por pago{' '}
          <select
            value={paymentFilter}
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
      </div>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Dirección</th>
              <th>Productos</th>
              <th>Total</th>
              <th>Entrega</th>
              <th>Pago</th>
            </tr>
          </thead>
          <tbody>
            {dispatches.map((d) => {
              const draft = drafts[d.id] ?? draftFrom(d);
              return (
                <tr key={d.id}>
                  <td>{d.sale.customer?.name ?? 'Cliente anónimo'}</td>
                  <td>{d.sale.customer?.address ?? '—'}</td>
                  <td>
                    <ul className="item-list dispatch-item-list">
                      {d.items.map((item) => {
                        const itemDraft = itemDrafts[item.id] ?? itemDraftFrom(item);
                        const sold = item.saleItem.quantity;
                        const short = Number(itemDraft.deliveredQuantity) < sold;
                        return (
                          <li key={item.id} className="dispatch-item-row">
                            <div>
                              {item.saleItem.product.name}{' '}
                              <span className="muted">(vendido: {sold})</span>
                            </div>
                            <div className="dispatch-item-controls">
                              <input
                                className={short ? 'status-yellow' : ''}
                                type="number"
                                min={0}
                                max={sold}
                                value={itemDraft.deliveredQuantity}
                                onChange={(e) => updateItemDraft(item.id, { deliveredQuantity: e.target.value })}
                              />
                              <input
                                type="text"
                                placeholder="Nota (ej: falta stock)"
                                value={itemDraft.notes}
                                onChange={(e) => updateItemDraft(item.id, { notes: e.target.value })}
                              />
                              <button
                                type="button"
                                disabled={savingItem === item.id}
                                onClick={() => saveItem(d.id, item.id)}
                              >
                                {savingItem === item.id ? '…' : 'Confirmar'}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </td>
                  <td>${d.sale.total.toLocaleString('es-CL')}</td>
                  <td>
                    <select
                      className={statusClass(d.deliveryStatus)}
                      value={d.deliveryStatus}
                      onChange={(e) => updateDelivery(d.id, e.target.value as DeliveryStatus)}
                    >
                      {Object.entries(DELIVERY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="payment-form">
                      <select
                        className={statusClass(draft.paymentStatus)}
                        value={draft.paymentStatus}
                        onChange={(e) => updateDraft(d.id, { paymentStatus: e.target.value as PaymentStatus })}
                      >
                        {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>

                      {draft.paymentStatus !== 'NOT_PAID' && (
                        <>
                          <select
                            value={draft.paymentMethod}
                            onChange={(e) => updateDraft(d.id, { paymentMethod: e.target.value as PaymentMethod })}
                          >
                            {Object.entries(METHOD_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={0}
                            placeholder="Monto pagado"
                            value={draft.paidAmount}
                            onChange={(e) => updateDraft(d.id, { paidAmount: e.target.value })}
                          />
                          {draft.paymentMethod === 'CHECK' && (
                            <label className="muted">
                              Vencimiento (30 días por defecto)
                              <input
                                type="date"
                                value={draft.checkDueDate}
                                onChange={(e) => updateDraft(d.id, { checkDueDate: e.target.value })}
                              />
                            </label>
                          )}
                        </>
                      )}

                      <button type="button" disabled={saving === d.id} onClick={() => savePayment(d.id)}>
                        {saving === d.id ? 'Guardando…' : 'Guardar pago'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {dispatches.length === 0 && (
              <tr>
                <td colSpan={6}>Sin despachos todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
