/*
  Warnings:

  - Added the required column `updatedAt` to the `assignment_submissions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "assignment_submissions" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "gradedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
