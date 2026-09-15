import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Product, Transfer } from '../api/types';

export default function TransfersPage() {
  const { user, activeWorkGroupId } = useAuth();
  const workGroups = user?.workGroups ?? [];

  const [fromWorkGroupId, setFromWorkGroupId] = useState(activeWorkGroupId ?? '');
  const [toWorkGroupId, setToWorkGroupId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const data = await api.get<Transfer[]>('/transfers');
      setTransfers(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkGroupId]);

  // El origen por defecto sigue al lugar de trabajo activo del selector de
  // la barra lateral, igual que el resto de las pantallas.
  useEffect(() => {
    setFromWorkGroupId(activeWorkGroupId ?? '');
  }, [activeWorkGroupId]);

  useEffect(() => {
    setToWorkGroupId((prev) => (prev === fromWorkGroupId ? '' : prev));
    if (!fromWorkGroupId) {
      setProducts([]);
      return;
    }
    setProductId('');
    api
      .get<Product[]>('/products', { workGroupId: fromWorkGroupId })
      .then((data) => setProducts([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Error de conexión'));
  }, [fromWorkGroupId]);

  const destinations = workGroups.filter((wg) => wg.id !== fromWorkGroupId);

  async function handleTransfer() {
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/transfers', {
        fromWorkGroupId,
        toWorkGroupId,
        fromProductId: productId,
        quantity: Number(quantity),
      });
      setProductId('');
      setQuantity('1');
      await loadHistory();
      // Recarga el stock del producto de origen (bajó tras el traspaso).
      const data = await api.get<Product[]>('/products', { workGroupId: fromWorkGroupId });
      setProducts([...data].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  }

  if (workGroups.length < 2) {
    return (
      <div>
        <h1>Traspasos</h1>
        <p>Necesitas pertenecer a más de un lugar de trabajo para traspasar stock entre bodegas.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Traspasos</h1>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Nuevo traspaso</h3>
        <div className="inline-form">
          <label>
            Desde{' '}
            <select value={fromWorkGroupId} onChange={(e) => setFromWorkGroupId(e.target.value)}>
              <option value="">Lugar de origen…</option>
              {workGroups.map((wg) => (
                <option key={wg.id} value={wg.id}>
                  {wg.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Producto{' '}
            <select value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!fromWorkGroupId}>
              <option value="">Producto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.quantity} disponibles)
                </option>
              ))}
            </select>
          </label>
          <input
            type="number"
            min={1}
            placeholder="Cantidad"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <label>
            Hacia{' '}
            <select value={toWorkGroupId} onChange={(e) => setToWorkGroupId(e.target.value)} disabled={!fromWorkGroupId}>
              <option value="">Lugar de destino…</option>
              {destinations.map((wg) => (
                <option key={wg.id} value={wg.id}>
                  {wg.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <button
            type="button"
            disabled={submitting || !fromWorkGroupId || !toWorkGroupId || !productId || !Number(quantity)}
            onClick={handleTransfer}
          >
            {submitting ? 'Traspasando…' : 'Traspasar'}
          </button>
        </div>
      </div>

      <h3>Historial</h3>
      {loadingHistory ? (
        <p>Cargando…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Dirección</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Costo</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => {
              const outgoing = t.fromWorkGroupId === activeWorkGroupId;
              return (
                <tr key={t.id}>
                  <td>{new Date(t.transferredAt).toLocaleString('es-CL')}</td>
                  <td>{outgoing ? `Enviado a ${t.toWorkGroup.name}` : `Recibido de ${t.fromWorkGroup.name}`}</td>
                  <td>{outgoing ? t.fromProduct.name : t.toProduct.name}</td>
                  <td>{t.quantity}</td>
                  <td>${t.totalCost.toLocaleString('es-CL')}</td>
                </tr>
              );
            })}
            {transfers.length === 0 && (
              <tr>
                <td colSpan={5}>Sin traspasos todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
