-- Migration: Add from_time and to_time fields to requests table
-- Run this in Supabase SQL Editor

-- Add new columns
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS from_time time,
ADD COLUMN IF NOT EXISTS to_time time;

-- Migrate existing data: set from_time = requested_time, to_time = requested_time + 1 hour
UPDATE requests 
SET 
  from_time = requested_time,
  to_time = (requested_time::time + interval '1 hour')::time
WHERE from_time IS NULL OR to_time IS NULL;

-- Make from_time and to_time required for new records (optional - you can keep requested_time for backward compatibility)
-- Or you can drop requested_time after migration:
-- ALTER TABLE requests DROP COLUMN requested_time;

