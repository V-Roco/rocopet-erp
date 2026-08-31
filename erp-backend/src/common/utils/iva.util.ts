export const IVA_RATE = 0.19;

// A partir de un total CON IVA, deriva el neto y el monto de IVA.
export function breakdownIva(grossTotal: number) {
  const net = Math.round(grossTotal / (1 + IVA_RATE));
  return { net, iva: grossTotal - net, total: grossTotal };
}
