import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizarRut, validarRut } from '../common/utils/rut.util';
import { isForeignKeyViolation } from '../common/utils/prisma-error.util';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSupplierDto) {
    if (!validarRut(dto.rut)) {
      throw new BadRequestException('RUT inválido');
    }

    try {
      return await this.prisma.supplier.create({
        data: {
          name: dto.name,
          rut: normalizarRut(dto.rut),
          phone: dto.phone,
          email: dto.email,
          address: dto.address,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un proveedor con ese RUT');
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado');
    }
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);

    if (dto.rut && !validarRut(dto.rut)) {
      throw new BadRequestException('RUT inválido');
    }

    try {
      return await this.prisma.supplier.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.rut !== undefined && { rut: normalizarRut(dto.rut) }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.address !== undefined && { address: dto.address }),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un proveedor con ese RUT');
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);

    try {
      return await this.prisma.supplier.delete({ where: { id } });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new BadRequestException(
          'No se puede eliminar: el proveedor tiene compras registradas',
        );
      }
      throw error;
    }
  }
}
