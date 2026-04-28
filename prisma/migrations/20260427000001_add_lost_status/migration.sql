-- Add LOST value to SalesOrderStatus enum
ALTER TYPE "SalesOrderStatus" ADD VALUE IF NOT EXISTS 'LOST';
