/*
  Warnings:

  - The primary key for the `center_payment_cards` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `center_payment_cards` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `center_subscriptions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `center_subscriptions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `center_telegram_bots` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `center_telegram_bots` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `centers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `centers` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `ownerUserId` column on the `centers` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `permissions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `plans` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `plans` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `refresh_tokens` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `refresh_tokens` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `role_permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `role_permissions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `roles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `roles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `telegram_users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `telegram_users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `centerId` column on the `telegram_users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `user_roles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `user_roles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `telegramUserId` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `centerId` on the `center_payment_cards` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `centerId` on the `center_subscriptions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `planId` on the `center_subscriptions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `centerId` on the `center_telegram_bots` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `refresh_tokens` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `roleId` on the `role_permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `permissionId` on the `role_permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `centerId` on the `roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `user_roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `roleId` on the `user_roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `centerId` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "center_payment_cards" DROP CONSTRAINT "center_payment_cards_centerId_fkey";

-- DropForeignKey
ALTER TABLE "center_subscriptions" DROP CONSTRAINT "center_subscriptions_centerId_fkey";

-- DropForeignKey
ALTER TABLE "center_subscriptions" DROP CONSTRAINT "center_subscriptions_planId_fkey";

-- DropForeignKey
ALTER TABLE "center_telegram_bots" DROP CONSTRAINT "center_telegram_bots_centerId_fkey";

-- DropForeignKey
ALTER TABLE "centers" DROP CONSTRAINT "centers_ownerUserId_fkey";

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_userId_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_roleId_fkey";

-- DropForeignKey
ALTER TABLE "roles" DROP CONSTRAINT "roles_centerId_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_roleId_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_userId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_centerId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_telegramUserId_fkey";

-- AlterTable
ALTER TABLE "center_payment_cards" DROP CONSTRAINT "center_payment_cards_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "centerId",
ADD COLUMN     "centerId" INTEGER NOT NULL,
ADD CONSTRAINT "center_payment_cards_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "center_subscriptions" DROP CONSTRAINT "center_subscriptions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "centerId",
ADD COLUMN     "centerId" INTEGER NOT NULL,
DROP COLUMN "planId",
ADD COLUMN     "planId" INTEGER NOT NULL,
ADD CONSTRAINT "center_subscriptions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "center_telegram_bots" DROP CONSTRAINT "center_telegram_bots_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "centerId",
ADD COLUMN     "centerId" INTEGER NOT NULL,
ADD CONSTRAINT "center_telegram_bots_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "centers" DROP CONSTRAINT "centers_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "ownerUserId",
ADD COLUMN     "ownerUserId" INTEGER,
ADD CONSTRAINT "centers_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "plans" DROP CONSTRAINT "plans_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" INTEGER NOT NULL,
ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "roleId",
ADD COLUMN     "roleId" INTEGER NOT NULL,
DROP COLUMN "permissionId",
ADD COLUMN     "permissionId" INTEGER NOT NULL,
ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "roles" DROP CONSTRAINT "roles_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "centerId",
ADD COLUMN     "centerId" INTEGER NOT NULL,
ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "telegram_users" DROP CONSTRAINT "telegram_users_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "centerId",
ADD COLUMN     "centerId" INTEGER,
ADD CONSTRAINT "telegram_users_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" INTEGER NOT NULL,
DROP COLUMN "roleId",
ADD COLUMN     "roleId" INTEGER NOT NULL,
ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "centerId",
ADD COLUMN     "centerId" INTEGER NOT NULL,
DROP COLUMN "telegramUserId",
ADD COLUMN     "telegramUserId" INTEGER,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "center_payment_cards_centerId_idx" ON "center_payment_cards"("centerId");

-- CreateIndex
CREATE INDEX "center_subscriptions_centerId_idx" ON "center_subscriptions"("centerId");

-- CreateIndex
CREATE INDEX "center_subscriptions_planId_idx" ON "center_subscriptions"("planId");

-- CreateIndex
CREATE INDEX "center_telegram_bots_centerId_idx" ON "center_telegram_bots"("centerId");

-- CreateIndex
CREATE INDEX "centers_ownerUserId_idx" ON "centers"("ownerUserId");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "roles_centerId_idx" ON "roles"("centerId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_slug_centerId_key" ON "roles"("slug", "centerId");

-- CreateIndex
CREATE INDEX "telegram_users_centerId_idx" ON "telegram_users"("centerId");

-- CreateIndex
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON "user_roles"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_telegramUserId_key" ON "users"("telegramUserId");

-- CreateIndex
CREATE INDEX "users_centerId_idx" ON "users"("centerId");

-- CreateIndex
CREATE INDEX "users_telegramUserId_idx" ON "users"("telegramUserId");

-- AddForeignKey
ALTER TABLE "centers" ADD CONSTRAINT "centers_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_telegramUserId_fkey" FOREIGN KEY ("telegramUserId") REFERENCES "telegram_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_telegram_bots" ADD CONSTRAINT "center_telegram_bots_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_payment_cards" ADD CONSTRAINT "center_payment_cards_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_subscriptions" ADD CONSTRAINT "center_subscriptions_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_subscriptions" ADD CONSTRAINT "center_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
