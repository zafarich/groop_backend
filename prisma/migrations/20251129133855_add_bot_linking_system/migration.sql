/*
  Warnings:

  - A unique constraint covering the columns `[botLinkToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "botLinkToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_botLinkToken_key" ON "users"("botLinkToken");
