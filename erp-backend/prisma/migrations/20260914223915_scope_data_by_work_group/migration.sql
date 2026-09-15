-- Agrega columnas como nullable primero, rellena las filas existentes con
-- el lugar de trabajo más antiguo (en la práctica, "Casa Matriz" tanto en
-- desarrollo como en producción, que hoy es el único real), y recién ahí
-- aplica NOT NULL. Hacerlo directo en un solo paso rompería contra las filas
-- que ya existen.

-- AlterTable: agregar columnas nullable
ALTER TABLE "Product" ADD COLUMN "workGroupId" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "workGroupId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "workGroupId" TEXT;
ALTER TABLE "Sale" ADD COLUMN "workGroupId" TEXT;
-- Purchase.workGroupId ya existe pero era opcional (puede tener NULLs).

-- Backfill: todas las filas sin lugar de trabajo quedan en el más antiguo.
UPDATE "Product" SET "workGroupId" = (SELECT id FROM "WorkGroup" ORDER BY "createdAt" ASC LIMIT 1) WHERE "workGroupId" IS NULL;
UPDATE "Supplier" SET "workGroupId" = (SELECT id FROM "WorkGroup" ORDER BY "createdAt" ASC LIMIT 1) WHERE "workGroupId" IS NULL;
UPDATE "Customer" SET "workGroupId" = (SELECT id FROM "WorkGroup" ORDER BY "createdAt" ASC LIMIT 1) WHERE "workGroupId" IS NULL;
UPDATE "Sale" SET "workGroupId" = (SELECT id FROM "WorkGroup" ORDER BY "createdAt" ASC LIMIT 1) WHERE "workGroupId" IS NULL;
UPDATE "Purchase" SET "workGroupId" = (SELECT id FROM "WorkGroup" ORDER BY "createdAt" ASC LIMIT 1) WHERE "workGroupId" IS NULL;

-- Ahora que no quedan NULLs, se puede exigir el valor.
ALTER TABLE "Product" ALTER COLUMN "workGroupId" SET NOT NULL;
ALTER TABLE "Supplier" ALTER COLUMN "workGroupId" SET NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "workGroupId" SET NOT NULL;
ALTER TABLE "Sale" ALTER COLUMN "workGroupId" SET NOT NULL;
ALTER TABLE "Purchase" ALTER COLUMN "workGroupId" SET NOT NULL;

-- El rut deja de ser único global y pasa a ser único por lugar de trabajo.
DROP INDEX "Customer_rut_key";
DROP INDEX "Supplier_rut_key";
CREATE UNIQUE INDEX "Customer_rut_workGroupId_key" ON "Customer"("rut", "workGroupId");
CREATE UNIQUE INDEX "Supplier_rut_workGroupId_key" ON "Supplier"("rut", "workGroupId");

-- Índices de consulta por lugar de trabajo.
CREATE INDEX "Product_workGroupId_idx" ON "Product"("workGroupId");
CREATE INDEX "Supplier_workGroupId_idx" ON "Supplier"("workGroupId");
CREATE INDEX "Customer_workGroupId_idx" ON "Customer"("workGroupId");
CREATE INDEX "Sale_workGroupId_idx" ON "Sale"("workGroupId");

-- Foreign keys de las columnas nuevas.
ALTER TABLE "Product" ADD CONSTRAINT "Product_workGroupId_fkey" FOREIGN KEY ("workGroupId") REFERENCES "WorkGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_workGroupId_fkey" FOREIGN KEY ("workGroupId") REFERENCES "WorkGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_workGroupId_fkey" FOREIGN KEY ("workGroupId") REFERENCES "WorkGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_workGroupId_fkey" FOREIGN KEY ("workGroupId") REFERENCES "WorkGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Purchase ya tenía su FK desde antes (la columna solo pasó de opcional a obligatoria).
