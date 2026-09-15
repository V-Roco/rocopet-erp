import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { breakdownIva } from '../common/utils/iva.util';
import { ADJUSTMENT_SUPPLIER_RUT, TRANSFER_SUPPLIER_RUT_PREFIX } from '../common/constants';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { QueryPurchasesReportDto } from './dto/query-purchases-report.dto';
import { endOfDay, startOfDay } from '../common/utils/date-range.util';

// Filtro para dejar fuera de gráficos/reportes las compras de proveedores
// internos: "Ajustes de inventario" (devoluciones de stock al editar una
// venta) y "Traspaso desde X" (stock que llegó de otra bodega, no de un
// proveedor real) — ninguna de las dos es una compra real y distorsionarían
// las cifras.
const EXCLUDE_INTERNAL_SUPPLIERS: Prisma.PurchaseWhereInput = {
  NOT: {
    OR: [
      { supplier: { rut: ADJUSTMENT_SUPPLIER_RUT } },
      { supplier: { rut: { startsWith: TRANSFER_SUPPLIER_RUT_PREFIX } } },
    ],
  },
};

const PURCHASE_INCLUDE = {
  supplier: { select: { id: true, name: true, rut: true } },
  workGroup: { select: { id: true, name: true } },
  items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
} as const;

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePurchaseDto, workGroupId: string) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, workGroupId } });
    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado');
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
        const product = await tx.product.findFirst({ where: { id: item.productId, workGroupId } });
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
          workGroupId,
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

  async update(id: string, dto: CreatePurchaseDto, workGroupId: string) {
    const existing = await this.prisma.purchase.findFirst({
      where: { id, workGroupId },
      include: { items: true },
    });
    if (!existing) {
      throw new NotFoundException('Compra no encontrada');
    }

    const supplier = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, workGroupId } });
    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    await this.prisma.$transaction(async (tx) => {
      const oldByProduct = new Map(existing.items.map((item) => [item.productId, item]));
      const newProductIds = new Set(dto.items.map((item) => item.productId));

      // Línea que ya no está en la venta editada: solo se puede quitar si
      // nada de ese lote se vendió todavía (si no, hay unidades vendidas
      // que quedarían sin lote de origen).
      for (const oldItem of existing.items) {
        if (newProductIds.has(oldItem.productId)) continue;
        const consumed = oldItem.quantity - oldItem.remainingQty;
        if (consumed > 0) {
          const product = await tx.product.findUnique({ where: { id: oldItem.productId } });
          throw new BadRequestException(
            `No se puede quitar "${product?.name ?? oldItem.productId}": ya se vendieron ${consumed} unidad(es) de ese lote`,
          );
        }
        await tx.product.update({ where: { id: oldItem.productId }, data: { quantity: { decrement: oldItem.quantity } } });
        await tx.purchaseItem.delete({ where: { id: oldItem.id } });
      }

      let grossTotal = 0;
      for (const item of dto.items) {
        const oldItem = oldByProduct.get(item.productId);

        if (!oldItem) {
          const product = await tx.product.findFirst({ where: { id: item.productId, workGroupId } });
          if (!product) {
            throw new NotFoundException(`Producto ${item.productId} no encontrado`);
          }
          const lineTotal = item.quantity * item.unitCost;
          grossTotal += lineTotal;
          await tx.purchaseItem.create({
            data: {
              purchaseId: id,
              productId: item.productId,
              quantity: item.quantity,
              remainingQty: item.quantity,
              unitCost: item.unitCost,
              lineTotal,
            },
          });
          await tx.product.update({ where: { id: item.productId }, data: { quantity: { increment: item.quantity } } });
          continue;
        }

        const consumed = oldItem.quantity - oldItem.remainingQty;
        if (item.quantity < consumed) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          throw new BadRequestException(
            `No se puede bajar "${product?.name ?? item.productId}" a ${item.quantity}: ya se vendieron ${consumed} unidad(es) de ese lote`,
          );
        }

        const lineTotal = item.quantity * item.unitCost;
        grossTotal += lineTotal;
        await tx.purchaseItem.update({
          where: { id: oldItem.id },
          data: {
            quantity: item.quantity,
            remainingQty: item.quantity - consumed,
            unitCost: item.unitCost,
            lineTotal,
          },
        });
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity - oldItem.quantity } },
        });
      }

      const { net, iva } = breakdownIva(grossTotal);
      await tx.purchase.update({
        where: { id },
        data: {
          supplierId: dto.supplierId,
          subtotalNet: net,
          ivaAmount: iva,
          total: grossTotal,
        },
      });
    });

    const updated = await this.prisma.purchase.findUnique({ where: { id }, include: PURCHASE_INCLUDE });
    return withIvaBreakdown(updated!);
  }

  async findAll(workGroupId: string, productId?: string, supplierId?: string, from?: string, to?: string) {
    if (from && to && startOfDay(from) > endOfDay(to)) {
      throw new BadRequestException('"from" no puede ser posterior a "to"');
    }

    const purchases = await this.prisma.purchase.findMany({
      where: {
        workGroupId,
        ...(productId && { items: { some: { productId } } }),
        ...(supplierId && { supplierId }),
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

  async getChart(workGroupId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: { workGroupId, ...EXCLUDE_INTERNAL_SUPPLIERS },
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

  async getReport(dto: QueryPurchasesReportDto, workGroupId: string) {
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
            workGroupId,
            purchasedAt: { gte: fromDate, lte: toDate },
            ...(dto.supplierId && { supplierId: dto.supplierId }),
            ...EXCLUDE_INTERNAL_SUPPLIERS,
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
        workGroupId,
        purchasedAt: { gte: fromDate, lte: toDate },
        ...(dto.supplierId && { supplierId: dto.supplierId }),
        ...EXCLUDE_INTERNAL_SUPPLIERS,
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
