import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isForeignKeyViolation } from '../common/utils/prisma-error.util';
import { CreateWorkGroupDto } from './dto/create-work-group.dto';
import { UpdateWorkGroupDto } from './dto/update-work-group.dto';

@Injectable()
export class WorkGroupsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkGroupDto) {
    try {
      return await this.prisma.workGroup.create({ data: dto });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un lugar de trabajo con ese nombre');
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.workGroup.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const workGroup = await this.prisma.workGroup.findUnique({ where: { id } });
    if (!workGroup) {
      throw new NotFoundException('Lugar de trabajo no encontrado');
    }
    return workGroup;
  }

  async update(id: string, dto: UpdateWorkGroupDto) {
    await this.findOne(id);
    try {
      return await this.prisma.workGroup.update({ where: { id }, data: dto });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un lugar de trabajo con ese nombre');
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      return await this.prisma.workGroup.delete({ where: { id } });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new BadRequestException(
          'No se puede eliminar: el lugar de trabajo tiene usuarios o rangos asociados',
        );
      }
      throw error;
    }
  }
}
