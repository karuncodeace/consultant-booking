-- Migration: Add from_time and to_time fields to requests table
-- NOTE: This migration is for reference only. If requested_time has already been removed from the database,
-- you only need to ensure from_time and to_time columns exist.

-- Add new columns (if they don't exist)
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS from_time time,
ADD COLUMN IF NOT EXISTS to_time time;

-- If you still have requested_time column and want to migrate data:
-- UPDATE requests 
-- SET 
--   from_time = requested_time,
--   to_time = (requested_time::time + interval '1 hour')::time
-- WHERE from_time IS NULL OR to_time IS NULL;

-- Drop requested_time column (if it still exists and you want to remove it):
-- ALTER TABLE requests DROP COLUMN IF EXISTS requested_time;

