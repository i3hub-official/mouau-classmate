-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerificationAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emailVerificationRequired" BOOLEAN NOT NULL DEFAULT true;
