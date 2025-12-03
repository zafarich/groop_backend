/*
  Warnings:

  - A unique constraint covering the columns `[telegramGroupId]` on the table `groups` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "status" "GroupStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "telegramGroupId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "groups_telegramGroupId_key" ON "groups"("telegramGroupId");

-- CreateIndex
CREATE INDEX "groups_status_idx" ON "groups"("status");

-- CreateIndex
CREATE INDEX "groups_telegramGroupId_idx" ON "groups"("telegramGroupId");
