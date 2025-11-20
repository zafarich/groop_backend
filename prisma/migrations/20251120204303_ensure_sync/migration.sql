/*
  Warnings:

  - Made the column `ownerUserId` on table `centers` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "centers" DROP CONSTRAINT "centers_ownerUserId_fkey";

-- AlterTable
ALTER TABLE "centers" ALTER COLUMN "ownerUserId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "centers" ADD CONSTRAINT "centers_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
