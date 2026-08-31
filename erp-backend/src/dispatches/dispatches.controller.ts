import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { DeliveryStatus, PaymentStatus, SystemRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireRole, SystemRoleGuard } from '../auth/guards/system-role.guard';
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
    @Query('deliveryStatus') deliveryStatus?: DeliveryStatus,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
  ) {
    return this.dispatchesService.findAll(deliveryStatus, paymentStatus);
  }

  @Get('calendar')
  getCalendar(@Query() query: QueryCalendarDto) {
    return this.dispatchesService.getCalendar(query.from, query.to);
  }

  @Get('pending')
  getPending() {
    return this.dispatchesService.getPending();
  }

  // Resúmenes financieros de todo el negocio (no despachos operativos
  // puntuales): igual que ventas/compras, solo ADMIN/PARTNER.
  @Get('accounts-receivable')
  @UseGuards(SystemRoleGuard)
  @RequireRole(SystemRole.ADMIN, SystemRole.PARTNER)
  getAccountsReceivable() {
    return this.dispatchesService.getAccountsReceivable();
  }

  @Get('report')
  @UseGuards(SystemRoleGuard)
  @RequireRole(SystemRole.ADMIN, SystemRole.PARTNER)
  getReport(@Query() query: QueryCalendarDto) {
    return this.dispatchesService.getReport(query.from, query.to);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dispatchesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDispatchDto) {
    return this.dispatchesService.update(id, dto);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateDispatchItemDto,
  ) {
    return this.dispatchesService.updateItem(id, itemId, dto);
  }
}
