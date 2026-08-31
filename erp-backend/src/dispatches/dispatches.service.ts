import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDispatchDto } from './dto/update-dispatch.dto';
import { UpdateDispatchItemDto } from './dto/update-dispatch-item.dto';
import { endOfDay, startOfDay } from '../common/utils/date-range.util';

const DISPATCH_INCLUDE = {
  sale: {
    include: {
      customer: { select: { id: true, name: true, phone: true, address: true, latitude: true, longitude: true } },
    },
  },
  items: {
    include: {
      saleItem: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
    },
  },
} as const;

@Injectable()
export class DispatchesService {
  constructor(private prisma: PrismaService) {}

  findAll(deliveryStatus?: DeliveryStatus, paymentStatus?: PaymentStatus) {
    return this.prisma.dispatch.findMany({
      where: {
        ...(deliveryStatus && { deliveryStatus }),
        ...(paymentStatus && { paymentStatus }),
      },
      orderBy: { createdAt: 'desc' },
      include: DISPATCH_INCLUDE,
    });
  }

  async findOne(id: string) {
    const dispatch = await this.prisma.dispatch.findUnique({
      where: { id },
      include: DISPATCH_INCLUDE,
    });
    if (!dispatch) {
      throw new NotFoundException('Despacho no encontrado');
    }
    return dispatch;
  }

  async update(id: string, dto: UpdateDispatchDto) {
    const dispatch = await this.findOne(id);

    const paymentStatus = dto.paymentStatus ?? dispatch.paymentStatus;
    const paymentMethod = dto.paymentMethod ?? dispatch.paymentMethod;
    let paidAmount = dto.paidAmount ?? dispatch.paidAmount;
    let checkDueDate: Date | null = dispatch.checkDueDate;

    if (paymentStatus === PaymentStatus.NOT_PAID) {
      paidAmount = 0;
      checkDueDate = null;
    } else {
      if (!paymentMethod) {
        throw new BadRequestException('Falta el tipo de pago (efectivo, cheque, transferencia o abono)');
      }
      if (paymentStatus === PaymentStatus.COMPLETE) {
        paidAmount = dto.paidAmount ?? dispatch.sale.total;
      } else if (!paidAmount) {
        throw new BadRequestException('Falta indicar el monto pagado para un pago parcial o incompleto');
      }

      if (paymentMethod === 'CHECK') {
        // Los cheques normalmente se cobran a 30 días; si no se indica una
        // fecha explícita, se calcula automáticamente.
        checkDueDate = dto.checkDueDate
          ? new Date(dto.checkDueDate)
          : (checkDueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      } else {
        checkDueDate = null;
      }
    }

    return this.prisma.dispatch.update({
      where: { id },
      data: {
        ...(dto.deliveryStatus !== undefined && { deliveryStatus: dto.deliveryStatus }),
        ...(dto.scheduledFor !== undefined && { scheduledFor: new Date(dto.scheduledFor) }),
        paymentStatus,
        paymentMethod: paymentStatus === PaymentStatus.NOT_PAID ? null : paymentMethod,
        paidAmount,
        checkDueDate,
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: DISPATCH_INCLUDE,
    });
  }

  async getPending() {
    const dispatches = await this.prisma.dispatch.findMany({
      where: {
        OR: [
          { deliveryStatus: { not: DeliveryStatus.COMPLETE } },
          { paymentStatus: { not: PaymentStatus.COMPLETE } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: DISPATCH_INCLUDE,
    });

    const summary = summarizeDispatches(dispatches);

    return { summary, dispatches };
  }

  async getAccountsReceivable() {
    const dispatches = await this.prisma.dispatch.findMany({
      where: { paymentStatus: { not: PaymentStatus.COMPLETE } },
      // Los cheques por vencer primero (los que no son cheque quedan al final, con checkDueDate null).
      orderBy: [{ checkDueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
      include: DISPATCH_INCLUDE,
    });

    const summary = summarizeDispatches(dispatches);

    return { summary, dispatches };
  }

  async getReport(from: string, to: string) {
    const fromDate = startOfDay(from);
    const toDate = endOfDay(to);
    if (fromDate > toDate) {
      throw new BadRequestException('"from" no puede ser posterior a "to"');
    }

    const dispatches = await this.prisma.dispatch.findMany({
      where: { sale: { soldAt: { gte: fromDate, lte: toDate } } },
      orderBy: { createdAt: 'desc' },
      include: DISPATCH_INCLUDE,
    });

    const summary = summarizeDispatches(dispatches);

    return { from, to, summary, dispatches };
  }

  async getCalendar(from: string, to: string) {
    const fromDate = startOfDay(from);
    const toDate = endOfDay(to);
    if (fromDate > toDate) {
      throw new BadRequestException('"from" no puede ser posterior a "to"');
    }

    const dispatches = await this.prisma.dispatch.findMany({
      where: { scheduledFor: { gte: fromDate, lte: toDate } },
      orderBy: { scheduledFor: 'asc' },
      include: DISPATCH_INCLUDE,
    });

    const byDay = new Map<string, typeof dispatches>();
    for (const dispatch of dispatches) {
      const day = dispatch.scheduledFor!.toISOString().slice(0, 10);
      const bucket = byDay.get(day) ?? [];
      bucket.push(dispatch);
      byDay.set(day, bucket);
    }

    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({ date, dispatches: items }));
  }

  async updateItem(dispatchId: string, itemId: string, dto: UpdateDispatchItemDto) {
    const item = await this.prisma.dispatchItem.findUnique({
      where: { id: itemId },
      include: { saleItem: true },
    });
    if (!item || item.dispatchId !== dispatchId) {
      throw new NotFoundException('Línea de despacho no encontrada');
    }

    if (dto.deliveredQuantity > item.saleItem.quantity) {
      throw new BadRequestException(
        `La cantidad entregada (${dto.deliveredQuantity}) no puede superar la cantidad vendida (${item.saleItem.quantity})`,
      );
    }

    return this.prisma.dispatchItem.update({
      where: { id: itemId },
      data: {
        deliveredQuantity: dto.deliveredQuantity,
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: { saleItem: { include: { product: { select: { id: true, name: true } } } } },
    });
  }
}

function summarizeDispatches(dispatches: { deliveryStatus: DeliveryStatus; paymentStatus: PaymentStatus; paidAmount: number; sale: { total: number } }[]) {
  const byDeliveryStatus: Partial<Record<DeliveryStatus, number>> = {};
  const byPaymentStatus: Partial<Record<PaymentStatus, number>> = {};
  let totalSales = 0;
  let totalPaid = 0;

  for (const dispatch of dispatches) {
    byDeliveryStatus[dispatch.deliveryStatus] = (byDeliveryStatus[dispatch.deliveryStatus] ?? 0) + 1;
    byPaymentStatus[dispatch.paymentStatus] = (byPaymentStatus[dispatch.paymentStatus] ?? 0) + 1;
    totalSales += dispatch.sale.total;
    totalPaid += dispatch.paidAmount;
  }

  return {
    count: dispatches.length,
    byDeliveryStatus,
    byPaymentStatus,
    totalSales,
    totalPaid,
    totalOwed: totalSales - totalPaid,
  };
}
