/*
  Warnings:

  - A unique constraint covering the columns `[emailSearchHash]` on the table `teachers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phoneSearchHash]` on the table `teachers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employeeIdSearchHash]` on the table `teachers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `institution` to the `teachers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `teachers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LECTURE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'TEACHER_REGISTERED';

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "emailSearchHash" TEXT,
ADD COLUMN     "employeeIdSearchHash" TEXT,
ADD COLUMN     "experience" TEXT,
ADD COLUMN     "institution" TEXT NOT NULL,
ADD COLUMN     "phoneSearchHash" TEXT,
ADD COLUMN     "photo" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "teachers_email_search_hash_key" ON "teachers"("emailSearchHash");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_phone_search_hash_key" ON "teachers"("phoneSearchHash");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_employee_id_search_hash_key" ON "teachers"("employeeIdSearchHash");
