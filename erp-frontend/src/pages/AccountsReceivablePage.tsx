import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { AccountsReceivable, Dispatch } from '../api/types';
import { PAYMENT_LABELS, METHOD_LABELS, statusClass } from '../lib/statusLabels';

const DAY_MS = 24 * 60 * 60 * 1000;

// Cheques vencidos = rojo (urgente). Por vencer dentro de 7 días = amarillo
// (hay que empezar a hacer seguimiento). Más lejos o sin cheque = sin marcar.
function checkRowClass(dispatch: Dispatch): string {
  if (dispatch.paymentMethod !== 'CHECK' || !dispatch.checkDueDate) return '';
  const daysLeft = (new Date(dispatch.checkDueDate).getTime() - Date.now()) / DAY_MS;
  if (daysLeft < 0) return 'status-red';
  if (daysLeft <= 7) return 'status-yellow';
  return '';
}

export default function AccountsReceivablePage() {
  const [data, setData] = useState<AccountsReceivable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<AccountsReceivable>('/dispatches/accounts-receivable'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1>Cuentas por cobrar</h1>
      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Cargando…</p>
      ) : (
        data && (
          <>
            <div className="card">
              <h3>Resumen</h3>
              <p>
                <strong>{data.summary.count}</strong> despacho{data.summary.count === 1 ? '' : 's'} con pago
                pendiente — total vendido ${data.summary.totalSales.toLocaleString('es-CL')}, pagado $
                {data.summary.totalPaid.toLocaleString('es-CL')}, adeudado{' '}
                <strong>${data.summary.totalOwed.toLocaleString('es-CL')}</strong>.
              </p>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Dirección</th>
                  <th>Total venta</th>
                  <th>Pagado</th>
                  <th>Adeudado</th>
                  <th>Método</th>
                  <th>Vencimiento cheque</th>
                  <th>Estado pago</th>
                </tr>
              </thead>
              <tbody>
                {data.dispatches.map((d) => (
                  <tr key={d.id} className={checkRowClass(d)}>
                    <td>{d.sale.customer?.name ?? 'Cliente anónimo'}</td>
                    <td>{d.sale.customer?.address ?? '—'}</td>
                    <td>${d.sale.total.toLocaleString('es-CL')}</td>
                    <td>${d.paidAmount.toLocaleString('es-CL')}</td>
                    <td>${(d.sale.total - d.paidAmount).toLocaleString('es-CL')}</td>
                    <td>{d.paymentMethod ? METHOD_LABELS[d.paymentMethod] : '—'}</td>
                    <td>{d.checkDueDate ? new Date(d.checkDueDate).toLocaleDateString('es-CL') : '—'}</td>
                    <td>
                      <span className={`status-badge ${statusClass(d.paymentStatus)}`}>
                        {PAYMENT_LABELS[d.paymentStatus]}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.dispatches.length === 0 && (
                  <tr>
                    <td colSpan={8}>No hay cuentas pendientes de cobro.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )
      )}
    </div>
  );
}
