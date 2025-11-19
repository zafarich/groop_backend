/*
  Warnings:

  - A unique constraint covering the columns `[telegramUserId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT', 'PARENT');

-- AlterTable
ALTER TABLE "centers" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "ownerUserId" TEXT;

-- AlterTable
ALTER TABLE "permissions" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "telegram_users" ADD COLUMN     "centerId" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" TEXT DEFAULT 'active';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "authProvider" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "telegramUserId" TEXT,
ADD COLUMN     "userType" "UserType" NOT NULL DEFAULT 'STUDENT',
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "center_telegram_bots" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "botToken" TEXT NOT NULL,
    "botUsername" TEXT,
    "displayName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "webhookUrl" TEXT,
    "secretToken" TEXT NOT NULL,
    "webhookSetAt" TIMESTAMP(3),
    "welcomeMessage" TEXT,
    "courseInfoTemplate" TEXT,
    "paymentInstruction" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "center_telegram_bots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "center_payment_cards" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "cardHolder" TEXT NOT NULL,
    "bankName" TEXT,
    "cardType" TEXT DEFAULT 'uzcard',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "displayOrder" INTEGER DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "center_payment_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPrice" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "maxStudents" INTEGER,
    "maxTeachers" INTEGER,
    "maxGroups" INTEGER,
    "maxCenters" INTEGER,
    "featuresJson" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "center_subscriptions" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "externalCustomerId" TEXT,
    "externalSubscriptionId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "center_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "center_telegram_bots_botToken_key" ON "center_telegram_bots"("botToken");

-- CreateIndex
CREATE UNIQUE INDEX "center_telegram_bots_secretToken_key" ON "center_telegram_bots"("secretToken");

-- CreateIndex
CREATE INDEX "center_telegram_bots_centerId_idx" ON "center_telegram_bots"("centerId");

-- CreateIndex
CREATE INDEX "center_telegram_bots_secretToken_idx" ON "center_telegram_bots"("secretToken");

-- CreateIndex
CREATE INDEX "center_telegram_bots_isDeleted_idx" ON "center_telegram_bots"("isDeleted");

-- CreateIndex
CREATE INDEX "center_payment_cards_centerId_idx" ON "center_payment_cards"("centerId");

-- CreateIndex
CREATE INDEX "center_payment_cards_isVisible_idx" ON "center_payment_cards"("isVisible");

-- CreateIndex
CREATE INDEX "center_payment_cards_isPrimary_idx" ON "center_payment_cards"("isPrimary");

-- CreateIndex
CREATE INDEX "center_payment_cards_isDeleted_idx" ON "center_payment_cards"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "plans_key_key" ON "plans"("key");

-- CreateIndex
CREATE INDEX "plans_isDeleted_idx" ON "plans"("isDeleted");

-- CreateIndex
CREATE INDEX "center_subscriptions_centerId_idx" ON "center_subscriptions"("centerId");

-- CreateIndex
CREATE INDEX "center_subscriptions_planId_idx" ON "center_subscriptions"("planId");

-- CreateIndex
CREATE INDEX "center_subscriptions_status_idx" ON "center_subscriptions"("status");

-- CreateIndex
CREATE INDEX "center_subscriptions_isDeleted_idx" ON "center_subscriptions"("isDeleted");

-- CreateIndex
CREATE INDEX "centers_ownerUserId_idx" ON "centers"("ownerUserId");

-- CreateIndex
CREATE INDEX "centers_isDeleted_idx" ON "centers"("isDeleted");

-- CreateIndex
CREATE INDEX "permissions_isDeleted_idx" ON "permissions"("isDeleted");

-- CreateIndex
CREATE INDEX "roles_isDeleted_idx" ON "roles"("isDeleted");

-- CreateIndex
CREATE INDEX "telegram_users_centerId_idx" ON "telegram_users"("centerId");

-- CreateIndex
CREATE INDEX "telegram_users_isDeleted_idx" ON "telegram_users"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "users_telegramUserId_key" ON "users"("telegramUserId");

-- CreateIndex
CREATE INDEX "users_telegramUserId_idx" ON "users"("telegramUserId");

-- CreateIndex
CREATE INDEX "users_userType_idx" ON "users"("userType");

-- CreateIndex
CREATE INDEX "users_isDeleted_idx" ON "users"("isDeleted");

-- AddForeignKey
ALTER TABLE "centers" ADD CONSTRAINT "centers_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_telegramUserId_fkey" FOREIGN KEY ("telegramUserId") REFERENCES "telegram_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_telegram_bots" ADD CONSTRAINT "center_telegram_bots_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_payment_cards" ADD CONSTRAINT "center_payment_cards_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_subscriptions" ADD CONSTRAINT "center_subscriptions_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_subscriptions" ADD CONSTRAINT "center_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
