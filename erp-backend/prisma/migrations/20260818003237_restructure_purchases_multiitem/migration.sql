-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_productId_fkey";

-- DropIndex
DROP INDEX "Purchase_productId_purchasedAt_idx";

-- DropIndex
DROP INDEX "Purchase_supplierId_idx";

-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN "productId",
DROP COLUMN "quantity",
DROP COLUMN "remainingQty",
DROP COLUMN "unitCost",
ADD COLUMN     "ivaAmount" INTEGER NOT NULL,
ADD COLUMN     "subtotalNet" INTEGER NOT NULL,
ADD COLUMN     "total" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "remainingQty" INTEGER NOT NULL,
    "unitCost" INTEGER NOT NULL,
    "lineTotal" INTEGER NOT NULL,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseItem_productId_remainingQty_idx" ON "PurchaseItem"("productId", "remainingQty");

-- CreateIndex
CREATE INDEX "Purchase_supplierId_purchasedAt_idx" ON "Purchase"("supplierId", "purchasedAt");

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

