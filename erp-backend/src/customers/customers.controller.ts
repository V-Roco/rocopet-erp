import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SystemRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireRole, SystemRoleGuard } from '../auth/guards/system-role.guard';
import { getActiveWorkGroupId } from '../common/utils/work-group.util';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, SystemRoleGuard)
@RequireRole(SystemRole.ADMIN, SystemRole.PARTNER)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Body() dto: CreateCustomerDto, @Req() req: Request) {
    return this.customersService.create(dto, getActiveWorkGroupId(req));
  }

  @Get()
  findAll(@Req() req: Request) {
    return this.customersService.findAll(getActiveWorkGroupId(req));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.customersService.findOne(id, getActiveWorkGroupId(req));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @Req() req: Request) {
    return this.customersService.update(id, dto, getActiveWorkGroupId(req));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.customersService.remove(id, getActiveWorkGroupId(req));
  }
}
