import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceType, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { breakdownIva } from '../common/utils/iva.util';
import { CreateSaleDto, SaleItemDto } from './dto/create-sale.dto';
import { QuerySalesReportDto } from './dto/query-sales-report.dto';
import { endOfDay, startOfDay } from '../common/utils/date-range.util';

const SALE_INCLUDE = {
  customer: true,
  items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
  dispatch: { select: { id: true, paymentStatus: true, deliveryStatus: true } },
} as const;

// RUT fijo (válido, sin dueño real) para el proveedor genérico bajo el que
// quedan las devoluciones de stock cuando se edita una venta ya despachada.
const ADJUSTMENT_SUPPLIER_RUT = '888888888';

interface SaleItemRow {
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  costOfGoods: number;
}

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  // Descuenta FIFO de los lotes de compra disponibles para cada línea. Se
  // procesa item por item (no en paralelo): si un mismo producto aparece en
  // varias líneas, cada una debe descontar a partir de donde dejó la
  // anterior. Se usa tanto para crear una venta como para reaplicar sus
  // items al editarla.
  private async consumeFifo(
    tx: Prisma.TransactionClient,
    items: SaleItemDto[],
  ): Promise<{ itemsData: SaleItemRow[]; grossTotal: number; totalCostOfGoods: number }> {
    let grossTotal = 0;
    let totalCostOfGoods = 0;
    const itemsData: SaleItemRow[] = [];

    for (const item of items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw new NotFoundException(`Producto ${item.productId} no encontrado`);
      }

      const batches = await tx.purchaseItem.findMany({
        where: { productId: item.productId, remainingQty: { gt: 0 } },
        orderBy: { purchase: { purchasedAt: 'asc' } },
      });

      const available = batches.reduce((sum, batch) => sum + batch.remainingQty, 0);
      if (available < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para "${product.name}": hay ${available} unidad(es) registradas en compras, se intentan vender ${item.quantity}`,
        );
      }

      let remaining = item.quantity;
      let itemCost = 0;
      for (const batch of batches) {
        if (remaining === 0) break;
        const take = Math.min(remaining, batch.remainingQty);
        // Costo FIFO al neto (sin IVA): el IVA de compra es crédito fiscal
        // recuperable, no forma parte del costo real de la mercadería.
        itemCost += take * breakdownIva(batch.unitCost).net;
        remaining -= take;

        await tx.purchaseItem.update({
          where: { id: batch.id },
          data: { remainingQty: batch.remainingQty - take },
        });
      }

      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });

      const lineTotal = item.quantity * item.unitPrice;
      grossTotal += lineTotal;
      totalCostOfGoods += itemCost;
      itemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal,
        costOfGoods: itemCost,
      });
    }

    return { itemsData, grossTotal, totalCostOfGoods };
  }

  // Reversa de consumeFifo: devuelve a inventario lo que una venta (o una
  // versión anterior de ella, al editarla) había descontado. Como no se
  // registra de qué lote exacto salió cada unidad, la devolución entra como
  // una compra nueva bajo un proveedor genérico de ajuste — así el costo
  // FIFO original (recalculado desde costOfGoods) queda preservado y el
  // movimiento queda visible en el historial de Compras, no oculto.
  private async releaseFifo(
    tx: Prisma.TransactionClient,
    items: { productId: string; quantity: number; costOfGoods: number }[],
  ) {
    if (items.length === 0) return;

    const supplier = await tx.supplier.upsert({
      where: { rut: ADJUSTMENT_SUPPLIER_RUT },
      update: {},
      create: { name: 'Ajustes de inventario', rut: ADJUSTMENT_SUPPLIER_RUT },
    });

    let grossTotal = 0;
    const purchaseItemsData: { productId: string; quantity: number; remainingQty: number; unitCost: number; lineTotal: number }[] = [];

    for (const item of items) {
      // Reconstruye el costo unitario CON IVA a partir del costo neto
      // guardado, para que el lote que se devuelve quede con un unitCost
      // consistente con cómo se ingresan las compras normalmente.
      const netUnitCost = item.costOfGoods / item.quantity;
      const unitCost = Math.round(netUnitCost * 1.19);
      const lineTotal = item.quantity * unitCost;
      grossTotal += lineTotal;
      purchaseItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        remainingQty: item.quantity,
        unitCost,
        lineTotal,
      });

      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: item.quantity } },
      });
    }

    const { net, iva } = breakdownIva(grossTotal);
    await tx.purchase.create({
      data: {
        supplierId: supplier.id,
        subtotalNet: net,
        ivaAmount: iva,
        total: grossTotal,
        items: { create: purchaseItemsData },
      },
    });
  }

  async create(dto: CreateSaleDto) {
    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer) {
        throw new NotFoundException('Cliente no encontrado');
      }
    }

    const saleId = await this.prisma.$transaction(async (tx) => {
      const { itemsData, grossTotal, totalCostOfGoods } = await this.consumeFifo(tx, dto.items);
      const { net, iva } = breakdownIva(grossTotal);

      const sale = await tx.sale.create({
        data: {
          customerId: dto.customerId,
          subtotalNet: net,
          ivaAmount: iva,
          total: grossTotal,
          costOfGoods: totalCostOfGoods,
          soldAt: dto.soldAt ? new Date(dto.soldAt) : undefined,
          items: { create: itemsData },
        },
        include: { items: true },
      });

      // El despacho se crea siempre junto con la venta, en estado
      // NOT_DELIVERED/NOT_PAID, con la cantidad entregada = cantidad vendida
      // por defecto (el trabajador la ajusta si algo llega defectuoso).
      await tx.dispatch.create({
        data: {
          saleId: sale.id,
          items: {
            create: sale.items.map((item) => ({
              saleItemId: item.id,
              deliveredQuantity: item.quantity,
            })),
          },
        },
      });

      return sale.id;
    });

    return this.findOne(saleId);
  }

  // Solo se puede editar mientras no se haya registrado ningún pago: una
  // vez que hay plata de por medio, cambiar montos dejaría el pago
  // descuadrado respecto a lo que realmente se debe.
  async update(id: string, dto: CreateSaleDto) {
    const existing = await this.prisma.sale.findUnique({
      where: { id },
      include: { items: true, dispatch: true },
    });
    if (!existing) {
      throw new NotFoundException('Venta no encontrada');
    }
    if (existing.dispatch && existing.dispatch.paymentStatus !== 'NOT_PAID') {
      throw new ConflictException('No se puede editar una venta que ya tiene pagos registrados');
    }
    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer) {
        throw new NotFoundException('Cliente no encontrado');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await this.releaseFifo(tx, existing.items);

      if (existing.dispatch) {
        await tx.dispatchItem.deleteMany({ where: { dispatchId: existing.dispatch.id } });
      }
      await tx.saleItem.deleteMany({ where: { saleId: id } });

      const { itemsData, grossTotal, totalCostOfGoods } = await this.consumeFifo(tx, dto.items);
      const { net, iva } = breakdownIva(grossTotal);

      const sale = await tx.sale.update({
        where: { id },
        data: {
          customerId: dto.customerId ?? null,
          subtotalNet: net,
          ivaAmount: iva,
          total: grossTotal,
          costOfGoods: totalCostOfGoods,
          items: { create: itemsData },
        },
        include: { items: true },
      });

      if (existing.dispatch) {
        await tx.dispatch.update({
          where: { id: existing.dispatch.id },
          data: {
            items: {
              create: sale.items.map((item) => ({
                saleItemId: item.id,
                deliveredQuantity: item.quantity,
              })),
            },
          },
        });
      }
    });

    return this.findOne(id);
  }

  findAll(customerId?: string, paymentStatus?: PaymentStatus, from?: string, to?: string) {
    if (from && to && startOfDay(from) > endOfDay(to)) {
      throw new BadRequestException('"from" no puede ser posterior a "to"');
    }

    return this.prisma.sale
      .findMany({
        where: {
          ...(customerId && { customerId }),
          ...(paymentStatus && { dispatch: { paymentStatus } }),
          ...((from || to) && {
            soldAt: {
              ...(from && { gte: startOfDay(from) }),
              ...(to && { lte: endOfDay(to) }),
            },
          }),
        },
        orderBy: { soldAt: 'desc' },
        include: SALE_INCLUDE,
      })
      .then((sales) => sales.map(withIvaBreakdown));
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({ where: { id }, include: SALE_INCLUDE });
    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }
    return withIvaBreakdown(sale);
  }

  // Marca la venta como facturada. Hoy la llama el flujo del RPA (que lee el
  // folio y tipo de documento del PDF que generó); a futuro la puede llamar
  // igual una integración con una API de facturación electrónica, pasando el
  // folio y tipo que la propia API devuelva en su respuesta.
  async setInvoiceUrl(id: string, invoiceUrl: string, invoiceFolio?: string, invoiceType?: InvoiceType) {
    const sale = await this.findOne(id);
    if (sale.invoiceUrl) {
      throw new ConflictException(
        'Esta venta ya tiene una factura adjunta; no se puede reemplazar',
      );
    }
    return this.prisma.sale.update({
      where: { id },
      data: {
        invoiceUrl,
        invoiceStatus: 'ISSUED',
        invoiceIssuedAt: new Date(),
        ...(invoiceFolio !== undefined && { invoiceFolio }),
        ...(invoiceType !== undefined && { invoiceType }),
      },
    });
  }

  async getInvoiceUrl(id: string) {
    const sale = await this.findOne(id);
    if (!sale.invoiceUrl) {
      throw new NotFoundException('Esta venta no tiene factura adjunta');
    }
    return sale.invoiceUrl;
  }

  async getChart() {
    const sales = await this.prisma.sale.findMany({
      orderBy: { soldAt: 'asc' },
      include: { items: true },
    });

    const byDay = new Map<string, { date: string; quantity: number; revenue: number; cost: number }>();
    for (const sale of sales) {
      const date = sale.soldAt.toISOString().slice(0, 10);
      const entry = byDay.get(date) ?? { date, quantity: 0, revenue: 0, cost: 0 };
      entry.quantity += sale.items.reduce((sum, item) => sum + item.quantity, 0);
      entry.revenue += sale.total;
      entry.cost += sale.costOfGoods;
      byDay.set(date, entry);
    }

    return Array.from(byDay.values()).map((entry) => ({
      ...entry,
      profit: entry.revenue - entry.cost,
    }));
  }

  async getReport(dto: QuerySalesReportDto) {
    const fromDate = startOfDay(dto.from);
    const toDate = endOfDay(dto.to);
    if (fromDate > toDate) {
      throw new BadRequestException('"from" no puede ser posterior a "to"');
    }

    // Si se filtra por producto, los totales se calculan a nivel de línea
    // (solo ese producto), no de venta completa: una venta puede mezclar
    // varios productos y el total de la venta incluiría los otros también.
    if (dto.productId) {
      const items = await this.prisma.saleItem.findMany({
        where: {
          productId: dto.productId,
          sale: {
            soldAt: { gte: fromDate, lte: toDate },
            ...(dto.customerId && { customerId: dto.customerId }),
          },
        },
        include: {
          product: { select: { id: true, name: true, imageUrl: true } },
          sale: { include: { customer: { select: { id: true, name: true } } } },
        },
        orderBy: { sale: { soldAt: 'desc' } },
      });

      const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const revenue = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const cost = items.reduce((sum, item) => sum + item.costOfGoods, 0);
      const { net, iva } = breakdownIva(revenue);
      const salesCount = new Set(items.map((item) => item.saleId)).size;

      return {
        from: dto.from,
        to: dto.to,
        scope: 'product' as const,
        summary: { salesCount, quantity, revenue, net, iva, cost, profit: revenue - cost },
        items,
      };
    }

    const sales = await this.prisma.sale.findMany({
      where: {
        soldAt: { gte: fromDate, lte: toDate },
        ...(dto.customerId && { customerId: dto.customerId }),
      },
      orderBy: { soldAt: 'desc' },
      include: SALE_INCLUDE,
    });

    const quantity = sales.reduce(
      (sum, sale) => sum + sale.items.reduce((s, item) => s + item.quantity, 0),
      0,
    );
    const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const net = sales.reduce((sum, sale) => sum + sale.subtotalNet, 0);
    const iva = sales.reduce((sum, sale) => sum + sale.ivaAmount, 0);
    const cost = sales.reduce((sum, sale) => sum + sale.costOfGoods, 0);

    return {
      from: dto.from,
      to: dto.to,
      scope: 'sale' as const,
      summary: { salesCount: sales.length, quantity, revenue, net, iva, cost, profit: revenue - cost },
      sales: sales.map(withIvaBreakdown),
    };
  }
}

// Agrega el desglose neto/IVA por línea (el de la venta completa ya viene
// guardado en subtotalNet/ivaAmount/total).
function withIvaBreakdown<T extends { items: { lineTotal: number }[] }>(sale: T) {
  return {
    ...sale,
    items: sale.items.map((item) => {
      const { net, iva } = breakdownIva(item.lineTotal);
      return { ...item, netTotal: net, ivaAmount: iva };
    }),
  };
}
