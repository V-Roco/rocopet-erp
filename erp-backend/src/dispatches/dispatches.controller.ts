import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { DeliveryStatus, PaymentStatus, SystemRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireRole, SystemRoleGuard } from '../auth/guards/system-role.guard';
import { getActiveWorkGroupId } from '../common/utils/work-group.util';
import { DispatchesService } from './dispatches.service';
import { UpdateDispatchDto } from './dto/update-dispatch.dto';
import { UpdateDispatchItemDto } from './dto/update-dispatch-item.dto';
import { QueryCalendarDto } from './dto/query-calendar.dto';

@Controller('dispatches')
@UseGuards(JwtAuthGuard)
export class DispatchesController {
  constructor(private readonly dispatchesService: DispatchesService) {}

  @Get()
  findAll(
    @Req() req: Request,
    @Query('deliveryStatus') deliveryStatus?: DeliveryStatus,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
  ) {
    return this.dispatchesService.findAll(getActiveWorkGroupId(req), deliveryStatus, paymentStatus);
  }

  @Get('calendar')
  getCalendar(@Query() query: QueryCalendarDto, @Req() req: Request) {
    return this.dispatchesService.getCalendar(query.from, query.to, getActiveWorkGroupId(req));
  }

  @Get('pending')
  getPending(@Req() req: Request) {
    return this.dispatchesService.getPending(getActiveWorkGroupId(req));
  }

  // Resúmenes financieros de todo el negocio (no despachos operativos
  // puntuales): igual que ventas/compras, solo ADMIN/PARTNER.
  @Get('accounts-receivable')
  @UseGuards(SystemRoleGuard)
  @RequireRole(SystemRole.ADMIN, SystemRole.PARTNER)
  getAccountsReceivable(@Req() req: Request) {
    return this.dispatchesService.getAccountsReceivable(getActiveWorkGroupId(req));
  }

  @Get('report')
  @UseGuards(SystemRoleGuard)
  @RequireRole(SystemRole.ADMIN, SystemRole.PARTNER)
  getReport(@Query() query: QueryCalendarDto, @Req() req: Request) {
    return this.dispatchesService.getReport(query.from, query.to, getActiveWorkGroupId(req));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.dispatchesService.findOne(id, getActiveWorkGroupId(req));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDispatchDto, @Req() req: Request) {
    return this.dispatchesService.update(id, dto, getActiveWorkGroupId(req));
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateDispatchItemDto,
    @Req() req: Request,
  ) {
    return this.dispatchesService.updateItem(id, itemId, dto, getActiveWorkGroupId(req));
  }
}
