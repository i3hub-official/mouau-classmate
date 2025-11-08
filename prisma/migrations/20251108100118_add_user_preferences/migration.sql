/*
  Warnings:

  - The values [USER_PREFERENCES_UPDATED] on the enum `AuditAction` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `UserPreferences` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuditAction_new" AS ENUM ('USER_REGISTERED', 'USER_LOGGED_IN', 'USER_LOGGED_OUT', 'EMAIL_VERIFIED', 'PROFILE_UPDATED', 'STUDENT_REGISTERED', 'ENROLLMENT_CREATED', 'ASSIGNMENT_SUBMITTED', 'PORTFOLIO_CREATED', 'COURSE_CREATED', 'ASSIGNMENT_CREATED', 'GRADE_ASSIGNED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET', 'SESSION_REFRESHED', 'SESSION_CLEANED_UP', 'SESSION_CREATED', 'SESSION_INVALIDATED', 'ALL_SESSIONS_INVALIDATED', 'NOTIFICATION_SENT', 'SYSTEM_CONFIG_UPDATED', 'SUSPICIOUS_ACTIVITY_DETECTED', 'RATE_LIMIT_EXCEEDED', 'DEVICE_FINGERPRINT_MISMATCH', 'RESEND_VERIFICATION_REQUESTED', 'USER_LOGIN_FAILED', 'EMAIL_VERIFICATION_FAILED', 'USER_LOGIN_ERROR', 'EXPORT_TRANSCRIPT', 'EXPORT_TRANSCRIPT_FAILED', 'DATA_EXPORT_REQUESTED', 'ACCOUNT_DELETION_REQUESTED', 'NOTIFICATION_SETTINGS_UPDATED', 'USER_PROFILE_VIEWED', 'PASSWORD_CHANGED', 'SECURITY_SETTINGS_UPDATED', 'ACCOUNT_DELETION', 'PORTFOLIO_UPDATED', 'USER_PREFERENCES', 'NOTIFICATION_SETTINGS_RESET');
ALTER TABLE "audit_logs" ALTER COLUMN "action" TYPE "AuditAction_new" USING ("action"::text::"AuditAction_new");
ALTER TYPE "AuditAction" RENAME TO "AuditAction_old";
ALTER TYPE "AuditAction_new" RENAME TO "AuditAction";
DROP TYPE "public"."AuditAction_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."UserPreferences" DROP CONSTRAINT "UserPreferences_userId_fkey";

-- DropTable
DROP TABLE "public"."UserPreferences";

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "assignmentReminders" BOOLEAN NOT NULL DEFAULT true,
    "gradeAlerts" BOOLEAN NOT NULL DEFAULT true,
    "lectureReminders" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
