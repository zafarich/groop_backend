-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activeCenterId" INTEGER;

-- CreateTable
CREATE TABLE "user_centers" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "centerId" INTEGER NOT NULL,
    "role" "UserType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_centers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_centers_userId_idx" ON "user_centers"("userId");

-- CreateIndex
CREATE INDEX "user_centers_centerId_idx" ON "user_centers"("centerId");

-- CreateIndex
CREATE INDEX "user_centers_isDeleted_idx" ON "user_centers"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "user_centers_userId_centerId_key" ON "user_centers"("userId", "centerId");

-- CreateIndex
CREATE INDEX "users_activeCenterId_idx" ON "users"("activeCenterId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_activeCenterId_fkey" FOREIGN KEY ("activeCenterId") REFERENCES "centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_centers" ADD CONSTRAINT "user_centers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_centers" ADD CONSTRAINT "user_centers_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
