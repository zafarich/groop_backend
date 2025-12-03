/*
  Warnings:

  - A unique constraint covering the columns `[connectToken]` on the table `groups` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "connectToken" TEXT,
ADD COLUMN     "connectTokenExpires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "groups_connectToken_key" ON "groups"("connectToken");

-- CreateIndex
CREATE INDEX "groups_connectToken_idx" ON "groups"("connectToken");
