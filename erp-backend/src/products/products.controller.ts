import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { SystemRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireRole, SystemRoleGuard } from '../auth/guards/system-role.guard';
import { getActiveWorkGroupId } from '../common/utils/work-group.util';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

// Lista blanca de tipos de imagen real (no cualquier "image/*", que el
// cliente puede falsificar). La extensión con la que se guarda en disco sale
// de esta tabla, nunca del nombre de archivo original: si se derivara del
// nombre original, alguien podría subir "foto.svg" con Content-Type
// "image/png" y terminar sirviendo un .svg (que puede traer <script>) como
// si fuera una imagen de producto, ya que esta carpeta se sirve pública.
const ALLOWED_IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const productImageInterceptor = FileInterceptor('image', {
  storage: diskStorage({
    destination: './uploads/products',
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${ALLOWED_IMAGE_EXTENSIONS[file.mimetype]}`);
    },
  }),
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_EXTENSIONS[file.mimetype]) {
      callback(new BadRequestException('El archivo debe ser una imagen (JPG, PNG, WEBP o GIF)'), false);
      return;
    }
    callback(null, true);
  },
  // El frontend ya redimensiona la imagen antes de subirla (las fotos de
  // celular fácilmente superan 5MB en crudo); este límite es solo un techo
  // de seguridad por si llega algo directo a la API sin pasar por esa
  // compresión.
  limits: { fileSize: 15 * 1024 * 1024 },
});

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(SystemRoleGuard)
  @RequireRole(SystemRole.ADMIN, SystemRole.PARTNER)
  @UseInterceptors(productImageInterceptor)
  create(@Body() dto: CreateProductDto, @Req() req: Request, @UploadedFile() file?: Express.Multer.File) {
    const imageUrl = file ? `/uploads/products/${file.filename}` : null;
    return this.productsService.create(dto, imageUrl, getActiveWorkGroupId(req));
  }

  @Get()
  findAll(@Req() req: Request) {
    return this.productsService.findAll(getActiveWorkGroupId(req));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.productsService.findOne(id, getActiveWorkGroupId(req));
  }

  @Get(':id/stock-value')
  @UseGuards(SystemRoleGuard)
  @RequireRole(SystemRole.ADMIN, SystemRole.PARTNER)
  getStockValue(@Param('id') id: string, @Req() req: Request) {
    return this.productsService.getStockValue(id, getActiveWorkGroupId(req));
  }

  @Patch(':id')
  @UseGuards(SystemRoleGuard)
  @RequireRole(SystemRole.ADMIN, SystemRole.PARTNER)
  @UseInterceptors(productImageInterceptor)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imageUrl = file ? `/uploads/products/${file.filename}` : undefined;
    return this.productsService.update(id, dto, getActiveWorkGroupId(req), imageUrl);
  }

  @Delete(':id')
  @UseGuards(SystemRoleGuard)
  @RequireRole(SystemRole.ADMIN, SystemRole.PARTNER)
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.productsService.remove(id, getActiveWorkGroupId(req));
  }
}
