import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SystemRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireRole, SystemRoleGuard } from '../auth/guards/system-role.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, SystemRoleGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Solo ADMIN crea perfiles nuevos (el socio tiene los mismos permisos
  // que el admin excepto este).
  @Post()
  @RequireRole(SystemRole.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @RequireRole(SystemRole.ADMIN, SystemRole.PARTNER)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequireRole(SystemRole.ADMIN, SystemRole.PARTNER)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  // Cambiar el rol de otro usuario equivale a crear un perfil con ese rol
  // (ej. ascender a alguien a ADMIN), así que aplica la misma restricción:
  // solo ADMIN puede hacerlo, aunque PARTNER sí puede editar el resto del
  // perfil (nombre, lugares de trabajo, activo/inactivo).
  @Patch(':id')
  @RequireRole(SystemRole.ADMIN, SystemRole.PARTNER)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: Request) {
    const requester = req.user as { systemRole: SystemRole };
    if (dto.systemRole !== undefined && requester.systemRole !== SystemRole.ADMIN) {
      throw new ForbiddenException('Solo un administrador puede cambiar el rol de un usuario');
    }
    return this.usersService.update(id, dto);
  }
}
