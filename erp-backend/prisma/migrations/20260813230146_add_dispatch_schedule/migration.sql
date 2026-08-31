-- AlterTable
ALTER TABLE "Dispatch" ADD COLUMN     "scheduledFor" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Dispatch_scheduledFor_idx" ON "Dispatch"("scheduledFor");
