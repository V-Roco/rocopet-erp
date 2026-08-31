import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireRole, SystemRoleGuard } from '../auth/guards/system-role.guard';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { QueryPurchasesReportDto } from './dto/query-purchases-report.dto';

@Controller('purchases')
@UseGuards(JwtAuthGuard, SystemRoleGuard)
@RequireRole(SystemRole.ADMIN, SystemRole.PARTNER)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  create(@Body() dto: CreatePurchaseDto) {
    return this.purchasesService.create(dto);
  }

  @Get()
  findAll(
    @Query('productId') productId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('workGroupId') workGroupId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.purchasesService.findAll(productId, supplierId, workGroupId, from, to);
  }

  @Get('report')
  getReport(@Query() query: QueryPurchasesReportDto) {
    return this.purchasesService.getReport(query);
  }

  @Get('chart')
  getChart() {
    return this.purchasesService.getChart();
  }
}
