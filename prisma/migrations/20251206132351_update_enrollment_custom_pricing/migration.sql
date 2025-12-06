/*
  Warnings:

  - You are about to drop the column `discountValidUntil` on the `enrollments` table. All the data in the column will be lost.
  - You are about to drop the column `individualDiscountAmount` on the `enrollments` table. All the data in the column will be lost.
  - You are about to drop the column `isRecurringDiscount` on the `enrollments` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "EnrollmentStatus" ADD VALUE 'TRIAL';

-- DropIndex
DROP INDEX "enrollments_discountValidUntil_idx";

-- AlterTable
ALTER TABLE "enrollments" DROP COLUMN "discountValidUntil",
DROP COLUMN "individualDiscountAmount",
DROP COLUMN "isRecurringDiscount",
ADD COLUMN     "customMonthlyPrice" DECIMAL(10,2),
ADD COLUMN     "discountEndDate" TIMESTAMP(3),
ADD COLUMN     "discountStartDate" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'LEAD';

-- CreateIndex
CREATE INDEX "enrollments_discountEndDate_idx" ON "enrollments"("discountEndDate");
