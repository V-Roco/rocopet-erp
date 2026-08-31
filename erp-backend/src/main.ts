import 'dotenv/config';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(
    helmet({
      // Las imágenes de producto se sirven cross-origin para el frontend
      // (puerto distinto); la política por defecto de recursos cruzados
      // de helmet las bloquearía.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(join(process.cwd(), 'public'));
  // Solo las imágenes de producto se sirven públicas. Las facturas (uploads/invoices)
  // NO se montan como estático: se descargan por GET /sales/:id/invoice, que exige login.
  app.useStaticAssets(join(process.cwd(), 'uploads', 'products'), { prefix: '/uploads/products/' });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
