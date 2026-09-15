import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { InvoiceType, PaymentStatus, SystemRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireRole, SystemRoleGuard } from '../auth/guards/system-role.guard';
import { getActiveWorkGroupId } from '../common/utils/work-group.util';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesReportDto } from './dto/query-sales-report.dto';

const INVOICE_DIR = './uploads/invoices';

@Controller('sales')
@UseGuards(JwtAuthGuard, SystemRoleGuard)
@RequireRole(SystemRole.ADMIN, SystemRole.PARTNER)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() dto: CreateSaleDto, @Req() req: Request) {
    return this.salesService.create(dto, getActiveWorkGroupId(req));
  }

  @Get()
  findAll(
    @Req() req: Request,
    @Query('customerId') customerId?: string,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.salesService.findAll(getActiveWorkGroupId(req), customerId, paymentStatus, from, to);
  }

  @Get('chart')
  getChart(@Req() req: Request) {
    return this.salesService.getChart(getActiveWorkGroupId(req));
  }

  @Get('customers-chart')
  getCustomersChart(@Req() req: Request) {
    return this.salesService.getCustomersChart(getActiveWorkGroupId(req));
  }

  @Get('report')
  getReport(@Query() query: QuerySalesReportDto, @Req() req: Request) {
    return this.salesService.getReport(query, getActiveWorkGroupId(req));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.salesService.findOne(id, getActiveWorkGroupId(req));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: CreateSaleDto, @Req() req: Request) {
    return this.salesService.update(id, dto, getActiveWorkGroupId(req));
  }

  @Post(':id/invoice')
  @UseInterceptors(
    FileInterceptor('invoice', {
      storage: diskStorage({
        destination: INVOICE_DIR,
        filename: (_req, _file, callback) => callback(null, `${randomUUID()}.pdf`),
      }),
      fileFilter: (_req, file, callback) => {
        if (file.mimetype !== 'application/pdf') {
          callback(new BadRequestException('El archivo debe ser un PDF'), false);
          return;
        }
        callback(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadInvoice(
    @Param('id') id: string,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
    @Body('folio') folio?: string,
    @Body('type') type?: InvoiceType,
  ) {
    if (!file) {
      throw new BadRequestException('Falta el archivo PDF de la factura');
    }
    try {
      return await this.salesService.setInvoiceUrl(
        id,
        getActiveWorkGroupId(req),
        `uploads/invoices/${file.filename}`,
        folio,
        type,
      );
    } catch (error) {
      // El archivo ya se escribió a disco antes de llegar acá (lo hace el
      // interceptor); si el guardado en la venta falla, no debe quedar huérfano.
      await unlink(file.path).catch(() => {});
      throw error;
    }
  }

  @Get(':id/invoice')
  async downloadInvoice(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const invoiceUrl = await this.salesService.getInvoiceUrl(id, getActiveWorkGroupId(req));
    const filePath = join(process.cwd(), ...invoiceUrl.split('/'));
    if (!existsSync(filePath)) {
      throw new NotFoundException('El archivo de la factura ya no existe');
    }
    res.type('application/pdf');
    res.sendFile(filePath);
  }
}
