export type SystemRole = 'ADMIN' | 'PARTNER' | 'EMPLOYEE';

export interface WorkGroup {
  id: string;
  name: string;
  description?: string | null;
  region?: string | null;
  isActive?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  systemRole: SystemRole;
  workGroups: WorkGroup[];
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export interface Product {
  id: string;
  name: string;
  quantity: number;
  minStock: number;
  imageUrl: string | null;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  rut: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface Customer {
  id: string;
  name: string;
  rut: string;
  giro: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  businessHours: string | null;
}

export interface PurchaseItem {
  id: string;
  productId: string;
  quantity: number;
  remainingQty: number;
  unitCost: number;
  lineTotal: number;
  netTotal: number;
  ivaAmount: number;
  product: { id: string; name: string; imageUrl: string | null };
}

export interface Purchase {
  id: string;
  supplierId: string;
  workGroupId: string | null;
  subtotalNet: number;
  ivaAmount: number;
  total: number;
  purchasedAt: string;
  createdAt: string;
  supplier: { id: string; name: string; rut: string };
  workGroup: { id: string; name: string } | null;
  items: PurchaseItem[];
}

export interface SaleItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  costOfGoods: number;
  netTotal: number;
  ivaAmount: number;
  product: { id: string; name: string; imageUrl: string | null };
}

export type DeliveryStatus = 'NOT_DELIVERED' | 'PARTIAL' | 'INCOMPLETE' | 'COMPLETE';
export type PaymentStatus = 'NOT_PAID' | 'PARTIAL' | 'INCOMPLETE' | 'COMPLETE';
export type PaymentMethod = 'CASH' | 'CHECK' | 'TRANSFER' | 'DEPOSIT';
export type InvoiceType = 'BOLETA' | 'FACTURA';
export type InvoiceStatus = 'PENDING' | 'ISSUED' | 'REJECTED';

export interface Sale {
  id: string;
  customerId: string | null;
  subtotalNet: number;
  ivaAmount: number;
  total: number;
  costOfGoods: number;
  invoiceUrl: string | null;
  invoiceStatus: InvoiceStatus;
  invoiceType: InvoiceType | null;
  invoiceFolio: string | null;
  invoiceIssuedAt: string | null;
  soldAt: string;
  createdAt: string;
  customer: Customer | null;
  items: SaleItem[];
  dispatch: { id: string; paymentStatus: PaymentStatus; deliveryStatus: DeliveryStatus } | null;
}

export interface DispatchItem {
  id: string;
  saleItemId: string;
  deliveredQuantity: number;
  notes: string | null;
  saleItem: SaleItem;
}

export interface Dispatch {
  id: string;
  saleId: string;
  deliveryStatus: DeliveryStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  paidAmount: number;
  checkDueDate: string | null;
  scheduledFor: string | null;
  notes: string | null;
  sale: Sale;
  items: DispatchItem[];
}

export interface DispatchSummary {
  count: number;
  byDeliveryStatus: Partial<Record<DeliveryStatus, number>>;
  byPaymentStatus: Partial<Record<PaymentStatus, number>>;
  totalSales: number;
  totalPaid: number;
  totalOwed: number;
}

export interface AccountsReceivable {
  summary: DispatchSummary;
  dispatches: Dispatch[];
}

export interface UserProfile {
  id: string;
  email: string;
  rut: string;
  fullName: string | null;
  systemRole: SystemRole;
  isActive: boolean;
  workGroups: WorkGroup[];
}

export interface SalesChartPoint {
  date: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface PurchasesChartPoint {
  date: string;
  quantity: number;
  net: number;
  cost: number;
}
