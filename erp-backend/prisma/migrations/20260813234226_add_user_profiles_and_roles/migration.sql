-- AlterEnum
BEGIN;
CREATE TYPE "SystemRole_new" AS ENUM ('ADMIN', 'PARTNER', 'EMPLOYEE');
ALTER TABLE "public"."User" ALTER COLUMN "systemRole" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "systemRole" TYPE "SystemRole_new" USING ("systemRole"::text::"SystemRole_new");
ALTER TYPE "SystemRole" RENAME TO "SystemRole_old";
ALTER TYPE "SystemRole_new" RENAME TO "SystemRole";
DROP TYPE "public"."SystemRole_old";
ALTER TABLE "User" ALTER COLUMN "systemRole" SET DEFAULT 'EMPLOYEE';
COMMIT;

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_workGroupId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "branchId",
DROP COLUMN "workGroupId",
ALTER COLUMN "systemRole" SET DEFAULT 'EMPLOYEE';

-- AlterTable
ALTER TABLE "WorkGroup" ADD COLUMN     "region" TEXT;

-- CreateTable
CREATE TABLE "_UserToWorkGroup" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserToWorkGroup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserToWorkGroup_B_index" ON "_UserToWorkGroup"("B");

-- AddForeignKey
ALTER TABLE "_UserToWorkGroup" ADD CONSTRAINT "_UserToWorkGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserToWorkGroup" ADD CONSTRAINT "_UserToWorkGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "WorkGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

