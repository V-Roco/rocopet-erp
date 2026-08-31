import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { api, ApiError } from '../api/client';
import type { Product, PurchasesChartPoint, SalesChartPoint } from '../api/types';
import { CHART_COLORS, formatCLP, formatDateLabel } from '../lib/chartTheme';

const AXIS_STYLE = { fontSize: 12, fill: CHART_COLORS.textMuted };

export default function ChartsPage() {
  const [sales, setSales] = useState<SalesChartPoint[]>([]);
  const [purchases, setPurchases] = useState<PurchasesChartPoint[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [s, p, prod] = await Promise.all([
          api.get<SalesChartPoint[]>('/sales/chart'),
          api.get<PurchasesChartPoint[]>('/purchases/chart'),
          api.get<Product[]>('/products'),
        ]);
        setSales(s);
        setPurchases(p);
        setProducts([...prod].sort((a, b) => b.quantity - a.quantity));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Error de conexión');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p>Cargando…</p>;

  return (
    <div>
      <h1>Gráficos</h1>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Inventario — stock actual por producto</h3>
        {products.length === 0 ? (
          <p className="muted">Sin productos todavía.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(120, products.length * 36)}>
            <BarChart data={products} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
              <XAxis type="number" tick={AXIS_STYLE} axisLine={{ stroke: CHART_COLORS.axis }} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={AXIS_STYLE}
                axisLine={{ stroke: CHART_COLORS.axis }}
                tickLine={false}
                width={140}
              />
              <Tooltip formatter={(value: unknown) => [Number(value), 'Cantidad']} />
              <Bar dataKey="quantity" name="Cantidad" fill={CHART_COLORS.series1} radius={[0, 4, 4, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h3>Compras — neto vs total por día</h3>
        {purchases.length === 0 ? (
          <p className="muted">Sin compras todavía.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={purchases}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                tick={AXIS_STYLE}
                axisLine={{ stroke: CHART_COLORS.axis }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatCLP(v)}
                tick={AXIS_STYLE}
                axisLine={{ stroke: CHART_COLORS.axis }}
                tickLine={false}
                width={90}
              />
              <Tooltip
                labelFormatter={(label: unknown) => formatDateLabel(String(label))}
                formatter={(value: unknown) => formatCLP(Number(value))}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: CHART_COLORS.textSecondary }} />
              <Line
                type="monotone"
                dataKey="net"
                name="Neto"
                stroke={CHART_COLORS.series1}
                strokeWidth={2}
                dot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: CHART_COLORS.series1 }}
              />
              <Line
                type="monotone"
                dataKey="cost"
                name="Total (con IVA)"
                stroke={CHART_COLORS.series2}
                strokeWidth={2}
                dot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: CHART_COLORS.series2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h3>Compras — unidades por día</h3>
        {purchases.length === 0 ? (
          <p className="muted">Sin compras todavía.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={purchases}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                tick={AXIS_STYLE}
                axisLine={{ stroke: CHART_COLORS.axis }}
                tickLine={false}
              />
              <YAxis tick={AXIS_STYLE} axisLine={{ stroke: CHART_COLORS.axis }} tickLine={false} />
              <Tooltip
                labelFormatter={(label: unknown) => formatDateLabel(String(label))}
                formatter={(value: unknown) => [Number(value), 'Unidades']}
              />
              <Bar dataKey="quantity" name="Unidades" fill={CHART_COLORS.series1} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h3>Ventas — ingresos, costo y utilidad por día</h3>
        {sales.length === 0 ? (
          <p className="muted">Sin ventas todavía.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={sales}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                tick={AXIS_STYLE}
                axisLine={{ stroke: CHART_COLORS.axis }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatCLP(v)}
                tick={AXIS_STYLE}
                axisLine={{ stroke: CHART_COLORS.axis }}
                tickLine={false}
                width={90}
              />
              <Tooltip
                labelFormatter={(label: unknown) => formatDateLabel(String(label))}
                formatter={(value: unknown) => formatCLP(Number(value))}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: CHART_COLORS.textSecondary }} />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Ingresos"
                stroke={CHART_COLORS.series1}
                strokeWidth={2}
                dot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: CHART_COLORS.series1 }}
              />
              <Line
                type="monotone"
                dataKey="cost"
                name="Costo"
                stroke={CHART_COLORS.series2}
                strokeWidth={2}
                dot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: CHART_COLORS.series2 }}
              />
              <Line
                type="monotone"
                dataKey="profit"
                name="Utilidad"
                stroke={CHART_COLORS.series3}
                strokeWidth={2}
                dot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: CHART_COLORS.series3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h3>Ventas — unidades vendidas por día</h3>
        {sales.length === 0 ? (
          <p className="muted">Sin ventas todavía.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sales}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                tick={AXIS_STYLE}
                axisLine={{ stroke: CHART_COLORS.axis }}
                tickLine={false}
              />
              <YAxis tick={AXIS_STYLE} axisLine={{ stroke: CHART_COLORS.axis }} tickLine={false} />
              <Tooltip
                labelFormatter={(label: unknown) => formatDateLabel(String(label))}
                formatter={(value: unknown) => [Number(value), 'Unidades']}
              />
              <Bar dataKey="quantity" name="Unidades" fill={CHART_COLORS.series3} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
