-- DropForeignKey
ALTER TABLE "centers" DROP CONSTRAINT "centers_ownerUserId_fkey";

-- AlterTable
ALTER TABLE "centers" ALTER COLUMN "ownerUserId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "centers" ADD CONSTRAINT "centers_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
