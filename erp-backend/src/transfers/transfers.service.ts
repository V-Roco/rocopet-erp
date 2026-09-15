import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { breakdownIva } from '../common/utils/iva.util';
import { transferSupplierRut } from '../common/constants';
import { CreateTransferDto } from './dto/create-transfer.dto';

const TRANSFER_INCLUDE = {
  fromWorkGroup: { select: { id: true, name: true } },
  toWorkGroup: { select: { id: true, name: true } },
  fromProduct: { select: { id: true, name: true, imageUrl: true } },
  toProduct: { select: { id: true, name: true, imageUrl: true } },
} as const;

@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTransferDto, userWorkGroupIds: string[]) {
    if (dto.fromWorkGroupId === dto.toWorkGroupId) {
      throw new BadRequestException('El lugar de origen y destino no pueden ser el mismo');
    }
    // A diferencia del resto del sistema (un solo "lugar de trabajo activo"),
    // acá se tocan dos bodegas a la vez: hay que pertenecer a ambas para
    // mover stock de una a otra.
    if (!userWorkGroupIds.includes(dto.fromWorkGroupId) || !userWorkGroupIds.includes(dto.toWorkGroupId)) {
      throw new ForbiddenException('No perteneces a uno de los dos lugares de trabajo');
    }

    const transferId = await this.prisma.$transaction(async (tx) => {
      const fromProduct = await tx.product.findFirst({
        where: { id: dto.fromProductId, workGroupId: dto.fromWorkGroupId },
      });
      if (!fromProduct) {
        throw new NotFoundException('Producto no encontrado en el lugar de origen');
      }

      const toWorkGroup = await tx.workGroup.findUnique({ where: { id: dto.toWorkGroupId } });
      const fromWorkGroup = await tx.workGroup.findUnique({ where: { id: dto.fromWorkGroupId } });
      if (!toWorkGroup || !fromWorkGroup) {
        throw new NotFoundException('Lugar de trabajo no encontrado');
      }

      // Descuenta FIFO del origen, igual que una venta (más simple: acá no
      // hay líneas ni precio de venta, solo una cantidad de un producto).
      const batches = await tx.purchaseItem.findMany({
        where: { productId: dto.fromProductId, remainingQty: { gt: 0 } },
        orderBy: { purchase: { purchasedAt: 'asc' } },
      });
      const available = batches.reduce((sum, batch) => sum + batch.remainingQty, 0);
      if (available < dto.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para "${fromProduct.name}": hay ${available} unidad(es) disponibles, se intentan traspasar ${dto.quantity}`,
        );
      }

      let remaining = dto.quantity;
      let netCost = 0;
      for (const batch of batches) {
        if (remaining === 0) break;
        const take = Math.min(remaining, batch.remainingQty);
        netCost += take * breakdownIva(batch.unitCost).net;
        remaining -= take;
        await tx.purchaseItem.update({
          where: { id: batch.id },
          data: { remainingQty: batch.remainingQty - take },
        });
      }

      await tx.product.update({
        where: { id: dto.fromProductId },
        data: { quantity: { decrement: dto.quantity } },
      });

      // Si el destino no tiene todavía este producto (por nombre), se crea
      // ahí con los mismos datos descriptivos — el stock parte en 0 y entra
      // por la compra que se crea más abajo.
      let toProduct = await tx.product.findFirst({
        where: { workGroupId: dto.toWorkGroupId, name: { equals: fromProduct.name, mode: 'insensitive' } },
      });
      if (!toProduct) {
        toProduct = await tx.product.create({
          data: {
            name: fromProduct.name,
            minStock: fromProduct.minStock,
            imageUrl: fromProduct.imageUrl,
            workGroupId: dto.toWorkGroupId,
          },
        });
      }

      const unitCost = Math.round(netCost / dto.quantity);
      const grossUnitCost = Math.round(unitCost * 1.19);
      const lineTotal = dto.quantity * grossUnitCost;
      const { net, iva } = breakdownIva(lineTotal);

      const supplier = await tx.supplier.upsert({
        where: { rut_workGroupId: { rut: transferSupplierRut(dto.fromWorkGroupId), workGroupId: dto.toWorkGroupId } },
        update: {},
        create: {
          name: `Traspaso desde ${fromWorkGroup.name}`,
          rut: transferSupplierRut(dto.fromWorkGroupId),
          workGroupId: dto.toWorkGroupId,
        },
      });

      await tx.purchase.create({
        data: {
          supplierId: supplier.id,
          workGroupId: dto.toWorkGroupId,
          subtotalNet: net,
          ivaAmount: iva,
          total: lineTotal,
          items: {
            create: [
              {
                productId: toProduct.id,
                quantity: dto.quantity,
                remainingQty: dto.quantity,
                unitCost: grossUnitCost,
                lineTotal,
              },
            ],
          },
        },
      });

      await tx.product.update({
        where: { id: toProduct.id },
        data: { quantity: { increment: dto.quantity } },
      });

      const transfer = await tx.transfer.create({
        data: {
          fromWorkGroupId: dto.fromWorkGroupId,
          toWorkGroupId: dto.toWorkGroupId,
          fromProductId: dto.fromProductId,
          toProductId: toProduct.id,
          quantity: dto.quantity,
          unitCost,
          totalCost: netCost,
        },
      });

      return transfer.id;
    });

    return this.prisma.transfer.findUnique({ where: { id: transferId }, include: TRANSFER_INCLUDE });
  }

  findAll(workGroupId: string) {
    return this.prisma.transfer.findMany({
      where: { OR: [{ fromWorkGroupId: workGroupId }, { toWorkGroupId: workGroupId }] },
      orderBy: { transferredAt: 'desc' },
      include: TRANSFER_INCLUDE,
    });
  }
}
