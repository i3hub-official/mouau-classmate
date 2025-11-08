-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'DATA_EXPORT_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_DELETION_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'NOTIFICATION_SETTINGS_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_PROFILE_VIEWED';
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'SECURITY_SETTINGS_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_DELETION';
ALTER TYPE "AuditAction" ADD VALUE 'PORTFOLIO_UPDATED';
