-- Debug script to test notification insertion
-- Run this in Supabase SQL Editor to verify the policy works

-- First, check what user you're logged in as
SELECT auth.uid() as current_user_id;

-- Check if you can see the notifications table
SELECT * FROM notifications LIMIT 1;

-- Try to insert a test notification (replace recipient_id with a valid profile ID)
-- This will show you the exact error if it fails
INSERT INTO notifications (recipient_id, message, type)
VALUES (
  '07e9466e-c098-4a0c-9919-7b12afe2569d'::uuid,  -- Replace with actual sales person profile ID
  'Test notification',
  'test'
)
RETURNING *;

-- Check all policies on notifications table
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'notifications';

-- Verify recipient_id references profiles table correctly
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'notifications' 
  AND column_name = 'recipient_id';

