-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "status" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "color" TEXT;
