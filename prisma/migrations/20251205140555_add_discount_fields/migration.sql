-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "isFreeEnrollment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRecurringDiscount" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "discountApplied" DECIMAL(10,2),
ADD COLUMN     "lessonsInPeriod" INTEGER;
