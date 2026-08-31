import type { DeliveryStatus, InvoiceStatus, PaymentMethod, PaymentStatus } from '../api/types';

export const DELIVERY_LABELS: Record<DeliveryStatus, string> = {
  NOT_DELIVERED: 'No entregado',
  PARTIAL: 'Parcial',
  INCOMPLETE: 'Incompleto',
  COMPLETE: 'Entregado',
};

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  NOT_PAID: 'No pagado',
  PARTIAL: 'Parcial',
  INCOMPLETE: 'Incompleto',
  COMPLETE: 'Pagado',
};

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CHECK: 'Cheque',
  TRANSFER: 'Transferencia',
  DEPOSIT: 'Abono',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  PENDING: 'Pendiente',
  ISSUED: 'Emitida',
  REJECTED: 'Rechazada',
};

// No entregado / no pagado = rojo (nada hecho). Parcial o incompleto =
// amarillo (a medio camino). Entregado/pagado completo = sin marcar.
export function statusClass(status: DeliveryStatus | PaymentStatus): string {
  if (status === 'NOT_DELIVERED' || status === 'NOT_PAID') return 'status-red';
  if (status === 'PARTIAL' || status === 'INCOMPLETE') return 'status-yellow';
  return '';
}

export function invoiceStatusClass(status: InvoiceStatus): string {
  if (status === 'REJECTED') return 'status-red';
  if (status === 'PENDING') return 'status-yellow';
  return '';
}
