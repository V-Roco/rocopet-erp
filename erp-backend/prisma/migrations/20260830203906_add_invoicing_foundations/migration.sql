-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('BOLETA', 'FACTURA');
-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'ISSUED', 'REJECTED');
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "giro" TEXT;
-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "invoiceFolio" TEXT,
ADD COLUMN     "invoiceIssuedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceStatus" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "invoiceType" "InvoiceType";

-- Backfill: ventas que ya tenían un PDF de factura subido quedan como emitidas.
UPDATE "Sale" SET "invoiceStatus" = 'ISSUED', "invoiceIssuedAt" = "createdAt" WHERE "invoiceUrl" IS NOT NULL;
