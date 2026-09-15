import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SystemRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireRole, SystemRoleGuard } from '../auth/guards/system-role.guard';
import { getActiveWorkGroupId } from '../common/utils/work-group.util';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, SystemRoleGuard)
@RequireRole(SystemRole.ADMIN, SystemRole.PARTNER)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  create(@Body() dto: CreateSupplierDto, @Req() req: Request) {
    return this.suppliersService.create(dto, getActiveWorkGroupId(req));
  }

  @Get()
  findAll(@Req() req: Request) {
    return this.suppliersService.findAll(getActiveWorkGroupId(req));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.suppliersService.findOne(id, getActiveWorkGroupId(req));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto, @Req() req: Request) {
    return this.suppliersService.update(id, dto, getActiveWorkGroupId(req));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.suppliersService.remove(id, getActiveWorkGroupId(req));
  }
}
