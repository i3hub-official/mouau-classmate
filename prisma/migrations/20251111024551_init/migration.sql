-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_REGISTERED';
ALTER TYPE "AuditAction" ADD VALUE 'ATTENDANCE_MARKED';

-- AlterEnum
ALTER TYPE "ResourceType" ADD VALUE 'ADMIN';

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "otherName" TEXT,
    "gender" "Gender",
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "qualification" TEXT,
    "specialization" TEXT,
    "experience" TEXT,
    "dateJoined" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "photo" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3),
    "emailSearchHash" TEXT,
    "phoneSearchHash" TEXT,
    "employeeIdSearchHash" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_employee_id_key" ON "admins"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "admins_phone_key" ON "admins"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_search_hash_key" ON "admins"("emailSearchHash");

-- CreateIndex
CREATE UNIQUE INDEX "admins_phone_search_hash_key" ON "admins"("phoneSearchHash");

-- CreateIndex
CREATE UNIQUE INDEX "admins_employee_id_search_hash_key" ON "admins"("employeeIdSearchHash");

-- CreateIndex
CREATE INDEX "admins_employeeId_idx" ON "admins"("employeeId");

-- CreateIndex
CREATE INDEX "admins_email_idx" ON "admins"("email");

-- CreateIndex
CREATE INDEX "admins_phone_idx" ON "admins"("phone");

-- CreateIndex
CREATE INDEX "admins_department_idx" ON "admins"("department");

-- CreateIndex
CREATE INDEX "admins_lastActivityAt_idx" ON "admins"("lastActivityAt");

-- CreateIndex
CREATE UNIQUE INDEX "admins_user_id_key" ON "admins"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "admins_employee_id_alt_key" ON "admins"("employeeId");

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
