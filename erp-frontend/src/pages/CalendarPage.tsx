import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Dispatch } from '../api/types';

interface CalendarDay {
  date: string;
  dispatches: Dispatch[];
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(addDaysIso(14));
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [unscheduled, setUnscheduled] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [calendarDays, allDispatches] = await Promise.all([
        api.get<CalendarDay[]>(`/dispatches/calendar?from=${from}&to=${to}`),
        api.get<Dispatch[]>('/dispatches'),
      ]);
      setDays(calendarDays);
      setUnscheduled(allDispatches.filter((d) => !d.scheduledFor && d.deliveryStatus !== 'COMPLETE'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function scheduleDispatch(id: string, date: string) {
    if (!date) return;
    try {
      await api.patch(`/dispatches/${id}`, { scheduledFor: `${date}T09:00:00.000Z` });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }

  return (
    <div>
      <h1>Calendario de despachos</h1>
      {error && <p className="error">{error}</p>}

      <div className="inline-form">
        <label>
          Desde <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Hasta <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button onClick={load}>Buscar</button>
      </div>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <>
          {days.length === 0 && <p className="muted">No hay despachos agendados en este rango.</p>}
          {days.map((day) => (
            <div className="card" key={day.date}>
              <h3>{new Date(`${day.date}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              <ul>
                {day.dispatches.map((d) => (
                  <li key={d.id}>
                    {d.sale.customer?.name ?? 'Cliente anónimo'} — {d.sale.customer?.address ?? 'sin dirección'} (
                    {d.items.map((i) => `${i.deliveredQuantity}× ${i.saleItem.product.name}`).join(', ')})
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {unscheduled.length > 0 && (
            <div className="card">
              <h3>Despachos sin agendar</h3>
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Agendar para</th>
                  </tr>
                </thead>
                <tbody>
                  {unscheduled.map((d) => (
                    <tr key={d.id}>
                      <td>{d.sale.customer?.name ?? 'Cliente anónimo'}</td>
                      <td>${d.sale.total.toLocaleString('es-CL')}</td>
                      <td>
                        <input type="date" onChange={(e) => scheduleDispatch(d.id, e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
