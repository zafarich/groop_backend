-- AlterEnum
ALTER TYPE "EnrollmentStatus" ADD VALUE 'LEAD';

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "lessonStartDate" TIMESTAMP(3);
