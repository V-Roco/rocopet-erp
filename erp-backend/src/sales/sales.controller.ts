import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { InvoiceType, PaymentStatus, SystemRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireRole, SystemRoleGuard } from '../auth/guards/system-role.guard';
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
  create(@Body() dto: CreateSaleDto) {
    return this.salesService.create(dto);
  }

  @Get()
  findAll(
    @Query('customerId') customerId?: string,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.salesService.findAll(customerId, paymentStatus, from, to);
  }

  @Get('chart')
  getChart() {
    return this.salesService.getChart();
  }

  @Get('report')
  getReport(@Query() query: QuerySalesReportDto) {
    return this.salesService.getReport(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
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
    @UploadedFile() file?: Express.Multer.File,
    @Body('folio') folio?: string,
    @Body('type') type?: InvoiceType,
  ) {
    if (!file) {
      throw new BadRequestException('Falta el archivo PDF de la factura');
    }
    try {
      return await this.salesService.setInvoiceUrl(id, `uploads/invoices/${file.filename}`, folio, type);
    } catch (error) {
      // El archivo ya se escribió a disco antes de llegar acá (lo hace el
      // interceptor); si el guardado en la venta falla, no debe quedar huérfano.
      await unlink(file.path).catch(() => {});
      throw error;
    }
  }

  @Get(':id/invoice')
  async downloadInvoice(@Param('id') id: string, @Res() res: Response) {
    const invoiceUrl = await this.salesService.getInvoiceUrl(id);
    const filePath = join(process.cwd(), ...invoiceUrl.split('/'));
    if (!existsSync(filePath)) {
      throw new NotFoundException('El archivo de la factura ya no existe');
    }
    res.type('application/pdf');
    res.sendFile(filePath);
  }
}
