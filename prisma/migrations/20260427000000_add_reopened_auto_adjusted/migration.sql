-- Add REOPENED and AUTO_ADJUSTED values to DailyLogStatus enum
-- PostgreSQL requires adding enum values outside transactions
ALTER TYPE "DailyLogStatus" ADD VALUE IF NOT EXISTS 'REOPENED';
ALTER TYPE "DailyLogStatus" ADD VALUE IF NOT EXISTS 'AUTO_ADJUSTED';

-- Add auto-adjustment tracking columns to DailyLog
ALTER TABLE "DailyLog"
  ADD COLUMN IF NOT EXISTS "autoAdjustedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "autoAdjustedBy" TEXT;
