import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { normalizarRut, validarRut } from '../common/utils/rut.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const USER_ARGS = {
  omit: { pinHash: true },
  include: { workGroups: { select: { id: true, name: true, region: true } } },
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    if (!validarRut(dto.rut)) {
      throw new BadRequestException('RUT inválido');
    }

    await this.assertWorkGroupsExist(dto.workGroupIds);

    const pinHash = await bcrypt.hash(dto.pin, 10);

    try {
      return await this.prisma.user.create({
        data: {
          email: dto.email,
          rut: normalizarRut(dto.rut),
          pinHash,
          fullName: dto.fullName,
          systemRole: dto.systemRole,
          workGroups: { connect: dto.workGroupIds.map((id) => ({ id })) },
        },
        ...USER_ARGS,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un usuario con ese correo o RUT');
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, ...USER_ARGS });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, ...USER_ARGS });
    if (!user) {
      throw new NotFoundException('Perfil no encontrado');
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    if (dto.workGroupIds) {
      await this.assertWorkGroupsExist(dto.workGroupIds);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.systemRole !== undefined && { systemRole: dto.systemRole }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        // set (no connect) reemplaza toda la asignación de lugares de trabajo.
        ...(dto.workGroupIds && { workGroups: { set: dto.workGroupIds.map((wgId) => ({ id: wgId })) } }),
      },
      ...USER_ARGS,
    });
  }

  private async assertWorkGroupsExist(workGroupIds: string[]) {
    const found = await this.prisma.workGroup.findMany({
      where: { id: { in: workGroupIds } },
      select: { id: true },
    });
    if (found.length !== new Set(workGroupIds).size) {
      throw new BadRequestException('Uno o más lugares de trabajo no existen');
    }
  }
}
