-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tempPasswordExpiresAt" TIMESTAMP(3);
