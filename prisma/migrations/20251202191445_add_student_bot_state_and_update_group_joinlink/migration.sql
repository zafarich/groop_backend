-- AlterTable
ALTER TABLE "groups" ALTER COLUMN "joinLink" DROP NOT NULL;

-- AlterTable
ALTER TABLE "telegram_users" ADD COLUMN     "userStep" TEXT;

-- CreateTable
CREATE TABLE "student_bot_states" (
    "id" SERIAL NOT NULL,
    "telegramUserId" INTEGER NOT NULL,
    "centerId" INTEGER NOT NULL,
    "currentStep" TEXT NOT NULL,
    "groupId" INTEGER,
    "selectedMonths" INTEGER,
    "paymentId" INTEGER,
    "contactShared" BOOLEAN NOT NULL DEFAULT false,
    "studentName" TEXT,
    "metadata" JSONB,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_bot_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_bot_states_telegramUserId_idx" ON "student_bot_states"("telegramUserId");

-- CreateIndex
CREATE INDEX "student_bot_states_centerId_idx" ON "student_bot_states"("centerId");

-- CreateIndex
CREATE INDEX "student_bot_states_currentStep_idx" ON "student_bot_states"("currentStep");

-- CreateIndex
CREATE INDEX "student_bot_states_isDeleted_idx" ON "student_bot_states"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "student_bot_states_telegramUserId_centerId_key" ON "student_bot_states"("telegramUserId", "centerId");

-- CreateIndex
CREATE INDEX "telegram_users_userStep_idx" ON "telegram_users"("userStep");
