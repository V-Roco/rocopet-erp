import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SystemRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireRole, SystemRoleGuard } from '../auth/guards/system-role.guard';
import { getActiveWorkGroupId } from '../common/utils/work-group.util';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { QueryPurchasesReportDto } from './dto/query-purchases-report.dto';

@Controller('purchases')
@UseGuards(JwtAuthGuard, SystemRoleGuard)
@RequireRole(SystemRole.ADMIN, SystemRole.PARTNER)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  create(@Body() dto: CreatePurchaseDto, @Req() req: Request) {
    return this.purchasesService.create(dto, getActiveWorkGroupId(req));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: CreatePurchaseDto, @Req() req: Request) {
    return this.purchasesService.update(id, dto, getActiveWorkGroupId(req));
  }

  @Get()
  findAll(
    @Req() req: Request,
    @Query('productId') productId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.purchasesService.findAll(getActiveWorkGroupId(req), productId, supplierId, from, to);
  }

  @Get('report')
  getReport(@Query() query: QueryPurchasesReportDto, @Req() req: Request) {
    return this.purchasesService.getReport(query, getActiveWorkGroupId(req));
  }

  @Get('chart')
  getChart(@Req() req: Request) {
    return this.purchasesService.getChart(getActiveWorkGroupId(req));
  }
}
