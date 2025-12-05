/*
  Warnings:

  - Added the required column `baseLessonPrice` to the `enrollments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "baseLessonPrice" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "isProrated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lessonsMissed" INTEGER;
