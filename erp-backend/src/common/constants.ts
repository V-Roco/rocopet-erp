// RUT fijo (válido, sin dueño real) para el proveedor genérico "Ajustes de
// inventario" bajo el que quedan las devoluciones de stock al editar una
// venta. Se excluye de gráficos/reportes de compras porque no es una compra
// real a un proveedor, sino un movimiento interno de inventario.
export const ADJUSTMENT_SUPPLIER_RUT = '888888888';

// Proveedor genérico bajo el que entra, en la bodega de destino, el stock que
// llega por un traspaso desde otra bodega — uno distinto por cada bodega de
// origen (de ahí que el RUT incorpore su id), para no mezclar en un solo
// proveedor traspasos que vienen de lugares distintos. Igual que los ajustes
// de inventario, se excluye de gráficos/reportes de compras: no es plata que
// salió a un proveedor real.
export const TRANSFER_SUPPLIER_RUT_PREFIX = 'TRASPASO-';

export function transferSupplierRut(fromWorkGroupId: string): string {
  return `${TRANSFER_SUPPLIER_RUT_PREFIX}${fromWorkGroupId}`;
}
