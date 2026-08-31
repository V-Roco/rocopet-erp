-- DropForeignKey
ALTER TABLE "Rank" DROP CONSTRAINT "Rank_workGroupId_fkey";
-- DropForeignKey
ALTER TABLE "RankPermission" DROP CONSTRAINT "RankPermission_permissionId_fkey";
-- DropForeignKey
ALTER TABLE "RankPermission" DROP CONSTRAINT "RankPermission_rankId_fkey";
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_rankId_fkey";
-- AlterTable
ALTER TABLE "User" DROP COLUMN "rankId";
-- DropTable
DROP TABLE "Permission";
-- DropTable
DROP TABLE "Rank";
-- DropTable
DROP TABLE "RankPermission";
