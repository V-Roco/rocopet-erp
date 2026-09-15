-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "fromWorkGroupId" TEXT NOT NULL,
    "toWorkGroupId" TEXT NOT NULL,
    "fromProductId" TEXT NOT NULL,
    "toProductId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" INTEGER NOT NULL,
    "totalCost" INTEGER NOT NULL,
    "transferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transfer_fromWorkGroupId_idx" ON "Transfer"("fromWorkGroupId");

-- CreateIndex
CREATE INDEX "Transfer_toWorkGroupId_idx" ON "Transfer"("toWorkGroupId");

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromWorkGroupId_fkey" FOREIGN KEY ("fromWorkGroupId") REFERENCES "WorkGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toWorkGroupId_fkey" FOREIGN KEY ("toWorkGroupId") REFERENCES "WorkGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromProductId_fkey" FOREIGN KEY ("fromProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toProductId_fkey" FOREIGN KEY ("toProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
