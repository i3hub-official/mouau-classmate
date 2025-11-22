-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'SESSION_TERMINATED';
ALTER TYPE "AuditAction" ADD VALUE 'SESSION_VALIDATION_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'SUSPICIOUS_ACTIVITY';
ALTER TYPE "AuditAction" ADD VALUE 'SESSION_VALIDATOR_ERROR';
ALTER TYPE "AuditAction" ADD VALUE 'MIDDLEWARE_FAILURE';
ALTER TYPE "AuditAction" ADD VALUE 'VALIDATOR_ERROR';

-- CreateTable
CREATE TABLE "RequestLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userId" TEXT,
    "userAgent" TEXT,
    "isAuthenticated" BOOLEAN NOT NULL,
    "threatScore" INTEGER NOT NULL DEFAULT 0,
    "securityLevel" TEXT NOT NULL DEFAULT 'low',
    "ipIntelligence" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataProcessingLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "jurisdiction" JSONB NOT NULL,
    "dataCategories" TEXT[],
    "legalBasis" TEXT NOT NULL,
    "consentGiven" BOOLEAN NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataProcessingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestLog_createdAt_idx" ON "RequestLog"("createdAt");

-- CreateIndex
CREATE INDEX "RequestLog_ipAddress_idx" ON "RequestLog"("ipAddress");

-- CreateIndex
CREATE INDEX "RequestLog_userId_idx" ON "RequestLog"("userId");

-- CreateIndex
CREATE INDEX "RequestLog_threatScore_idx" ON "RequestLog"("threatScore");

-- CreateIndex
CREATE INDEX "DataProcessingLog_timestamp_idx" ON "DataProcessingLog"("timestamp");

-- CreateIndex
CREATE INDEX "DataProcessingLog_userId_idx" ON "DataProcessingLog"("userId");

-- CreateIndex
CREATE INDEX "DataProcessingLog_country_idx" ON "DataProcessingLog"("country");

-- CreateIndex
CREATE INDEX "DataProcessingLog_legalBasis_idx" ON "DataProcessingLog"("legalBasis");
