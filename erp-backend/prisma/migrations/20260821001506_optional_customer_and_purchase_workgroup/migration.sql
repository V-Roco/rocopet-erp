-- DropForeignKey
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_customerId_fkey";

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "workGroupId" TEXT;

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "customerId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Purchase_workGroupId_idx" ON "Purchase"("workGroupId");

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_workGroupId_fkey" FOREIGN KEY ("workGroupId") REFERENCES "WorkGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

