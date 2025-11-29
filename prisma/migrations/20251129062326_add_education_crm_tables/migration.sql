-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('MONTHLY_SAME_DATE', 'START_TO_END_OF_MONTH', 'LESSON_BASED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "GroupStudentStatus" AS ENUM ('ACTIVE', 'FROZEN', 'REMOVED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "FreezeStatus" AS ENUM ('ACTIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PAYMENT_DUE', 'PAYMENT_OVERDUE', 'PAYMENT_REMINDER', 'FREEZE_APPROVED', 'FREEZE_ENDED', 'REFUND_PROCESSED', 'GROUP_REMOVED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('SCHEDULED', 'GENERATED', 'CANCELLED');

-- CreateTable
CREATE TABLE "teachers" (
    "id" SERIAL NOT NULL,
    "centerId" INTEGER NOT NULL,
    "userId" INTEGER,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "specialty" TEXT,
    "bio" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" SERIAL NOT NULL,
    "centerId" INTEGER NOT NULL,
    "userId" INTEGER,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "telegramUsername" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" SERIAL NOT NULL,
    "centerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyFee" DECIMAL(10,2) NOT NULL,
    "courseStartDate" TIMESTAMP(3) NOT NULL,
    "courseEndDate" TIMESTAMP(3) NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "lessonsPerPaymentPeriod" INTEGER,
    "hasUpfrontDiscount" BOOLEAN NOT NULL DEFAULT false,
    "upfrontDiscountPercent" DECIMAL(5,2),
    "joinLink" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_teachers" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_schedules" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_students" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "GroupStudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastPaymentDate" TIMESTAMP(3),
    "nextPaymentDate" TIMESTAMP(3),
    "paidUpfront" BOOLEAN NOT NULL DEFAULT false,
    "upfrontMonths" INTEGER,
    "removedAt" TIMESTAMP(3),
    "removalReason" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "centerId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "groupStudentId" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "lessonsIncluded" INTEGER,
    "lessonPrice" DECIMAL(10,2),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "notificationSentAt" TIMESTAMP(3),
    "overdueNoticeSent" BOOLEAN NOT NULL DEFAULT false,
    "overdueNoticeSentAt" TIMESTAMP(3),
    "daysOverdue" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_freezes" (
    "id" SERIAL NOT NULL,
    "groupStudentId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "freezeStartDate" TIMESTAMP(3) NOT NULL,
    "freezeEndDate" TIMESTAMP(3),
    "status" "FreezeStatus" NOT NULL DEFAULT 'ACTIVE',
    "actualEndDate" TIMESTAMP(3),
    "endedBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_freezes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" SERIAL NOT NULL,
    "centerId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "requestReason" TEXT NOT NULL,
    "totalPaid" DECIMAL(10,2) NOT NULL,
    "lessonsAttended" INTEGER NOT NULL,
    "totalLessons" INTEGER NOT NULL,
    "refundAmount" DECIMAL(10,2) NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "processedBy" INTEGER,
    "processedAt" TIMESTAMP(3),
    "processingNotes" TEXT,
    "completedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_notifications" (
    "id" SERIAL NOT NULL,
    "centerId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "paymentId" INTEGER,
    "notificationType" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "deliveryMethod" TEXT NOT NULL,
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_schedules" (
    "id" SERIAL NOT NULL,
    "centerId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "groupStudentId" INTEGER NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "paymentId" INTEGER,
    "generatedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teachers_centerId_idx" ON "teachers"("centerId");

-- CreateIndex
CREATE INDEX "teachers_userId_idx" ON "teachers"("userId");

-- CreateIndex
CREATE INDEX "teachers_isDeleted_idx" ON "teachers"("isDeleted");

-- CreateIndex
CREATE INDEX "students_centerId_idx" ON "students"("centerId");

-- CreateIndex
CREATE INDEX "students_userId_idx" ON "students"("userId");

-- CreateIndex
CREATE INDEX "students_phoneNumber_idx" ON "students"("phoneNumber");

-- CreateIndex
CREATE INDEX "students_isDeleted_idx" ON "students"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "groups_joinLink_key" ON "groups"("joinLink");

-- CreateIndex
CREATE INDEX "groups_centerId_idx" ON "groups"("centerId");

-- CreateIndex
CREATE INDEX "groups_joinLink_idx" ON "groups"("joinLink");

-- CreateIndex
CREATE INDEX "groups_isDeleted_idx" ON "groups"("isDeleted");

-- CreateIndex
CREATE INDEX "group_teachers_groupId_idx" ON "group_teachers"("groupId");

-- CreateIndex
CREATE INDEX "group_teachers_teacherId_idx" ON "group_teachers"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "group_teachers_groupId_teacherId_key" ON "group_teachers"("groupId", "teacherId");

-- CreateIndex
CREATE INDEX "lesson_schedules_groupId_idx" ON "lesson_schedules"("groupId");

-- CreateIndex
CREATE INDEX "group_students_groupId_idx" ON "group_students"("groupId");

-- CreateIndex
CREATE INDEX "group_students_studentId_idx" ON "group_students"("studentId");

-- CreateIndex
CREATE INDEX "group_students_status_idx" ON "group_students"("status");

-- CreateIndex
CREATE INDEX "group_students_nextPaymentDate_idx" ON "group_students"("nextPaymentDate");

-- CreateIndex
CREATE INDEX "group_students_isDeleted_idx" ON "group_students"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "group_students_groupId_studentId_key" ON "group_students"("groupId", "studentId");

-- CreateIndex
CREATE INDEX "payments_centerId_idx" ON "payments"("centerId");

-- CreateIndex
CREATE INDEX "payments_groupId_idx" ON "payments"("groupId");

-- CreateIndex
CREATE INDEX "payments_studentId_idx" ON "payments"("studentId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_dueDate_idx" ON "payments"("dueDate");

-- CreateIndex
CREATE INDEX "payments_isDeleted_idx" ON "payments"("isDeleted");

-- CreateIndex
CREATE INDEX "student_freezes_groupStudentId_idx" ON "student_freezes"("groupStudentId");

-- CreateIndex
CREATE INDEX "student_freezes_studentId_idx" ON "student_freezes"("studentId");

-- CreateIndex
CREATE INDEX "student_freezes_status_idx" ON "student_freezes"("status");

-- CreateIndex
CREATE INDEX "student_freezes_freezeStartDate_idx" ON "student_freezes"("freezeStartDate");

-- CreateIndex
CREATE INDEX "student_freezes_isDeleted_idx" ON "student_freezes"("isDeleted");

-- CreateIndex
CREATE INDEX "refund_requests_centerId_idx" ON "refund_requests"("centerId");

-- CreateIndex
CREATE INDEX "refund_requests_studentId_idx" ON "refund_requests"("studentId");

-- CreateIndex
CREATE INDEX "refund_requests_groupId_idx" ON "refund_requests"("groupId");

-- CreateIndex
CREATE INDEX "refund_requests_status_idx" ON "refund_requests"("status");

-- CreateIndex
CREATE INDEX "refund_requests_isDeleted_idx" ON "refund_requests"("isDeleted");

-- CreateIndex
CREATE INDEX "payment_notifications_centerId_idx" ON "payment_notifications"("centerId");

-- CreateIndex
CREATE INDEX "payment_notifications_studentId_idx" ON "payment_notifications"("studentId");

-- CreateIndex
CREATE INDEX "payment_notifications_paymentId_idx" ON "payment_notifications"("paymentId");

-- CreateIndex
CREATE INDEX "payment_notifications_deliveryStatus_idx" ON "payment_notifications"("deliveryStatus");

-- CreateIndex
CREATE INDEX "payment_notifications_sentAt_idx" ON "payment_notifications"("sentAt");

-- CreateIndex
CREATE INDEX "payment_schedules_centerId_idx" ON "payment_schedules"("centerId");

-- CreateIndex
CREATE INDEX "payment_schedules_groupId_idx" ON "payment_schedules"("groupId");

-- CreateIndex
CREATE INDEX "payment_schedules_studentId_idx" ON "payment_schedules"("studentId");

-- CreateIndex
CREATE INDEX "payment_schedules_scheduledDate_idx" ON "payment_schedules"("scheduledDate");

-- CreateIndex
CREATE INDEX "payment_schedules_status_idx" ON "payment_schedules"("status");

-- CreateIndex
CREATE INDEX "payment_schedules_isDeleted_idx" ON "payment_schedules"("isDeleted");

-- AddForeignKey
ALTER TABLE "group_teachers" ADD CONSTRAINT "group_teachers_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_teachers" ADD CONSTRAINT "group_teachers_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_schedules" ADD CONSTRAINT "lesson_schedules_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_students" ADD CONSTRAINT "group_students_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_students" ADD CONSTRAINT "group_students_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_freezes" ADD CONSTRAINT "student_freezes_groupStudentId_fkey" FOREIGN KEY ("groupStudentId") REFERENCES "group_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_freezes" ADD CONSTRAINT "student_freezes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
