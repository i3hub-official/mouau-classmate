/*
  Warnings:

  - Added the required column `courseId` to the `attendance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "courseId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "attendance_courseId_idx" ON "attendance"("courseId");

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
