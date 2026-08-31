import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { breakdownIva } from '../common/utils/iva.util';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { QueryPurchasesReportDto } from './dto/query-purchases-report.dto';
import { endOfDay, startOfDay } from '../common/utils/date-range.util';

const PURCHASE_INCLUDE = {
  supplier: { select: { id: true, name: true, rut: true } },
  workGroup: { select: { id: true, name: true } },
  items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
} as const;

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePurchaseDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado');
    }
    if (dto.workGroupId) {
      const workGroup = await this.prisma.workGroup.findUnique({ where: { id: dto.workGroupId } });
      if (!workGroup) {
        throw new NotFoundException('Lugar de trabajo no encontrado');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let grossTotal = 0;
      const itemsData: {
        productId: string;
        quantity: number;
        remainingQty: number;
        unitCost: number;
        lineTotal: number;
      }[] = [];

      for (const item of dto.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new NotFoundException(`Producto ${item.productId} no encontrado`);
        }

        const lineTotal = item.quantity * item.unitCost;
        grossTotal += lineTotal;
        itemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          remainingQty: item.quantity,
          unitCost: item.unitCost,
          lineTotal,
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      const { net, iva } = breakdownIva(grossTotal);

      return tx.purchase.create({
        data: {
          supplierId: dto.supplierId,
          workGroupId: dto.workGroupId,
          subtotalNet: net,
          ivaAmount: iva,
          total: grossTotal,
          purchasedAt: dto.purchasedAt ? new Date(dto.purchasedAt) : undefined,
          items: { create: itemsData },
        },
        include: PURCHASE_INCLUDE,
      }).then(withIvaBreakdown);
    });
  }

  async findAll(productId?: string, supplierId?: string, workGroupId?: string, from?: string, to?: string) {
    if (from && to && startOfDay(from) > endOfDay(to)) {
      throw new BadRequestException('"from" no puede ser posterior a "to"');
    }

    const purchases = await this.prisma.purchase.findMany({
      where: {
        ...(productId && { items: { some: { productId } } }),
        ...(supplierId && { supplierId }),
        ...(workGroupId && { workGroupId }),
        ...((from || to) && {
          purchasedAt: {
            ...(from && { gte: startOfDay(from) }),
            ...(to && { lte: endOfDay(to) }),
          },
        }),
      },
      orderBy: { purchasedAt: 'desc' },
      include: PURCHASE_INCLUDE,
    });
    return purchases.map(withIvaBreakdown);
  }

  async getChart() {
    const purchases = await this.prisma.purchase.findMany({
      orderBy: { purchasedAt: 'asc' },
      include: { items: true },
    });

    const byDay = new Map<string, { date: string; quantity: number; net: number; cost: number }>();
    for (const purchase of purchases) {
      const date = purchase.purchasedAt.toISOString().slice(0, 10);
      const entry = byDay.get(date) ?? { date, quantity: 0, net: 0, cost: 0 };
      entry.quantity += purchase.items.reduce((sum, item) => sum + item.quantity, 0);
      entry.net += purchase.subtotalNet;
      entry.cost += purchase.total;
      byDay.set(date, entry);
    }

    return Array.from(byDay.values());
  }

  async getReport(dto: QueryPurchasesReportDto) {
    const fromDate = startOfDay(dto.from);
    const toDate = endOfDay(dto.to);
    if (fromDate > toDate) {
      throw new BadRequestException('"from" no puede ser posterior a "to"');
    }

    // Igual que en el reporte de ventas: si se filtra por producto, los
    // totales se calculan a nivel de línea, no de compra completa (una
    // compra puede mezclar productos de costos distintos).
    if (dto.productId) {
      const items = await this.prisma.purchaseItem.findMany({
        where: {
          productId: dto.productId,
          purchase: {
            purchasedAt: { gte: fromDate, lte: toDate },
            ...(dto.supplierId && { supplierId: dto.supplierId }),
          },
        },
        include: {
          product: { select: { id: true, name: true, imageUrl: true } },
          purchase: { include: { supplier: { select: { id: true, name: true } } } },
        },
        orderBy: { purchase: { purchasedAt: 'desc' } },
      });

      const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const { net, iva } = breakdownIva(total);
      const purchasesCount = new Set(items.map((item) => item.purchaseId)).size;

      return {
        from: dto.from,
        to: dto.to,
        scope: 'product' as const,
        summary: { purchasesCount, quantity, total, net, iva },
        items,
      };
    }

    const purchases = await this.prisma.purchase.findMany({
      where: {
        purchasedAt: { gte: fromDate, lte: toDate },
        ...(dto.supplierId && { supplierId: dto.supplierId }),
      },
      orderBy: { purchasedAt: 'desc' },
      include: PURCHASE_INCLUDE,
    });

    const quantity = purchases.reduce(
      (sum, purchase) => sum + purchase.items.reduce((s, item) => s + item.quantity, 0),
      0,
    );
    const total = purchases.reduce((sum, purchase) => sum + purchase.total, 0);
    const net = purchases.reduce((sum, purchase) => sum + purchase.subtotalNet, 0);
    const iva = purchases.reduce((sum, purchase) => sum + purchase.ivaAmount, 0);
    const supplierCount = new Set(purchases.map((purchase) => purchase.supplierId)).size;

    return {
      from: dto.from,
      to: dto.to,
      scope: 'purchase' as const,
      summary: { purchasesCount: purchases.length, quantity, total, net, iva, supplierCount },
      purchases: purchases.map(withIvaBreakdown),
    };
  }
}

// Agrega el desglose neto/IVA por línea (el de la compra completa ya viene
// guardado en subtotalNet/ivaAmount/total).
function withIvaBreakdown<T extends { items: { lineTotal: number }[] }>(purchase: T) {
  return {
    ...purchase,
    items: purchase.items.map((item) => {
      const { net, iva } = breakdownIva(item.lineTotal);
      return { ...item, netTotal: net, ivaAmount: iva };
    }),
  };
}
