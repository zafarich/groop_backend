/*
  Warnings:

  - You are about to drop the column `hasUpfrontDiscount` on the `groups` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyFee` on the `groups` table. All the data in the column will be lost.
  - You are about to drop the column `upfrontDiscountPercent` on the `groups` table. All the data in the column will be lost.
  - You are about to drop the column `groupStudentId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `groupStudentId` on the `student_freezes` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `telegramUsername` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `teachers` table. All the data in the column will be lost.
  - You are about to drop the `group_students` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `monthlyPrice` to the `groups` table without a default value. This is not possible if the table is not empty.
  - Added the required column `enrollmentId` to the `student_freezes` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `students` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userId` on table `teachers` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'FROZEN', 'EXPELLED', 'COMPLETED', 'DROPPED');

-- DropForeignKey
ALTER TABLE "group_students" DROP CONSTRAINT "group_students_groupId_fkey";

-- DropForeignKey
ALTER TABLE "group_students" DROP CONSTRAINT "group_students_studentId_fkey";

-- DropForeignKey
ALTER TABLE "student_freezes" DROP CONSTRAINT "student_freezes_groupStudentId_fkey";

-- DropIndex
DROP INDEX "student_freezes_groupStudentId_idx";

-- DropIndex
DROP INDEX "students_phoneNumber_idx";

-- AlterTable
ALTER TABLE "groups" DROP COLUMN "hasUpfrontDiscount",
DROP COLUMN "monthlyFee",
DROP COLUMN "upfrontDiscountPercent",
ADD COLUMN     "monthlyPrice" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "groupStudentId",
ADD COLUMN     "enrollmentId" INTEGER,
ALTER COLUMN "periodStart" DROP NOT NULL,
ALTER COLUMN "periodEnd" DROP NOT NULL,
ALTER COLUMN "paymentType" DROP NOT NULL,
ALTER COLUMN "dueDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "student_freezes" DROP COLUMN "groupStudentId",
ADD COLUMN     "enrollmentId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "students" DROP COLUMN "email",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "phoneNumber",
DROP COLUMN "telegramUsername",
ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "teachers" DROP COLUMN "email",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "phoneNumber",
ALTER COLUMN "userId" SET NOT NULL;

-- DropTable
DROP TABLE "group_students";

-- DropEnum
DROP TYPE "GroupStudentStatus";

-- CreateTable
CREATE TABLE "group_discounts" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "months" INTEGER NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "perLessonPrice" DECIMAL(10,2) NOT NULL,
    "discountValidUntil" TIMESTAMP(3),
    "lastPaymentDate" TIMESTAMP(3),
    "nextPaymentDate" TIMESTAMP(3),
    "paidUpfrontMonths" INTEGER,
    "upfrontValidUntil" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "removalReason" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_discounts_groupId_idx" ON "group_discounts"("groupId");

-- CreateIndex
CREATE INDEX "group_discounts_isDeleted_idx" ON "group_discounts"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "group_discounts_groupId_months_key" ON "group_discounts"("groupId", "months");

-- CreateIndex
CREATE INDEX "enrollments_groupId_idx" ON "enrollments"("groupId");

-- CreateIndex
CREATE INDEX "enrollments_studentId_idx" ON "enrollments"("studentId");

-- CreateIndex
CREATE INDEX "enrollments_status_idx" ON "enrollments"("status");

-- CreateIndex
CREATE INDEX "enrollments_balance_idx" ON "enrollments"("balance");

-- CreateIndex
CREATE INDEX "enrollments_nextPaymentDate_idx" ON "enrollments"("nextPaymentDate");

-- CreateIndex
CREATE INDEX "enrollments_discountValidUntil_idx" ON "enrollments"("discountValidUntil");

-- CreateIndex
CREATE INDEX "enrollments_isDeleted_idx" ON "enrollments"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_groupId_studentId_key" ON "enrollments"("groupId", "studentId");

-- CreateIndex
CREATE INDEX "payments_enrollmentId_idx" ON "payments"("enrollmentId");

-- CreateIndex
CREATE INDEX "payments_periodStart_idx" ON "payments"("periodStart");

-- CreateIndex
CREATE INDEX "payments_periodEnd_idx" ON "payments"("periodEnd");

-- CreateIndex
CREATE INDEX "student_freezes_enrollmentId_idx" ON "student_freezes"("enrollmentId");

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_discounts" ADD CONSTRAINT "group_discounts_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_freezes" ADD CONSTRAINT "student_freezes_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
