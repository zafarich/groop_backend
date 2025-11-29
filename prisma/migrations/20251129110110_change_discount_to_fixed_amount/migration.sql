/*
  Warnings:

  - You are about to drop the column `discountPercent` on the `enrollments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "enrollments" DROP COLUMN "discountPercent",
ADD COLUMN     "individualDiscountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00;
