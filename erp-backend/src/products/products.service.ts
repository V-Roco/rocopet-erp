import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { isForeignKeyViolation } from '../common/utils/prisma-error.util';
import { breakdownIva } from '../common/utils/iva.util';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateProductDto, imageUrl: string | null) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        ...(dto.minStock !== undefined && { minStock: dto.minStock }),
        imageUrl,
      },
    });
  }

  findAll() {
    return this.prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return product;
  }

  async getStockValue(productId: string) {
    const product = await this.findOne(productId);

    const batches = await this.prisma.purchaseItem.findMany({
      where: { productId, remainingQty: { gt: 0 } },
    });

    const trackedQuantity = batches.reduce((sum, batch) => sum + batch.remainingQty, 0);
    // Valorizado al costo NETO (sin IVA): el IVA de compra es crédito fiscal
    // recuperable, no forma parte del costo real de inventario.
    const totalValue = batches.reduce(
      (sum, batch) => sum + batch.remainingQty * breakdownIva(batch.unitCost).net,
      0,
    );

    return {
      productId,
      productQuantity: product.quantity,
      trackedQuantity,
      totalValue,
    };
  }

  async update(id: string, dto: UpdateProductDto, imageUrl?: string | null) {
    const product = await this.findOne(id);

    if (imageUrl !== undefined && product.imageUrl) {
      await this.deleteImageFile(product.imageUrl);
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.minStock !== undefined && { minStock: dto.minStock }),
        ...(imageUrl !== undefined && { imageUrl }),
      },
    });
  }

  async remove(id: string) {
    const product = await this.findOne(id);

    try {
      await this.prisma.product.delete({ where: { id } });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new BadRequestException(
          'No se puede eliminar: el producto tiene compras o ventas registradas',
        );
      }
      throw error;
    }

    if (product.imageUrl) {
      await this.deleteImageFile(product.imageUrl);
    }

    return product;
  }

  private async deleteImageFile(imageUrl: string) {
    try {
      await unlink(join(process.cwd(), imageUrl));
    } catch {
      // El archivo ya no existe o no se pudo borrar; no es crítico.
    }
  }
}
