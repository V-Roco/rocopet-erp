import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizarRut, validarRut } from '../common/utils/rut.util';
import { isForeignKeyViolation } from '../common/utils/prisma-error.util';
import { geocodeAddress } from '../common/utils/geocoding.util';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    if (!validarRut(dto.rut)) {
      throw new BadRequestException('RUT inválido');
    }

    const coords = dto.address ? await geocodeAddress(dto.address) : null;

    try {
      return await this.prisma.customer.create({
        data: {
          name: dto.name,
          rut: normalizarRut(dto.rut),
          giro: dto.giro,
          email: dto.email,
          phone: dto.phone,
          address: dto.address,
          businessHours: dto.businessHours,
          latitude: coords?.lat,
          longitude: coords?.lng,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un cliente con ese RUT');
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.customer.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);

    if (dto.rut && !validarRut(dto.rut)) {
      throw new BadRequestException('RUT inválido');
    }

    const coords = dto.address ? await geocodeAddress(dto.address) : undefined;

    try {
      return await this.prisma.customer.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.rut !== undefined && { rut: normalizarRut(dto.rut) }),
          ...(dto.giro !== undefined && { giro: dto.giro }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.address !== undefined && {
            address: dto.address,
            // Si la dirección cambió, siempre se pisan las coordenadas (con las
            // nuevas, o con null si la geocodificación falló) para no dejar
            // lat/lng apuntando a la dirección anterior.
            latitude: coords?.lat ?? null,
            longitude: coords?.lng ?? null,
          }),
          ...(dto.businessHours !== undefined && { businessHours: dto.businessHours }),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un cliente con ese RUT');
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);

    try {
      return await this.prisma.customer.delete({ where: { id } });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new BadRequestException('No se puede eliminar: el cliente tiene ventas registradas');
      }
      throw error;
    }
  }
}
