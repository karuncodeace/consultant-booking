-- Check if RLS policy is working correctly
-- Run this in Supabase SQL Editor

-- Step 1: Check current INSERT policy
SELECT 
  policyname,
  cmd,
  roles,
  permissive,
  with_check,
  qual
FROM pg_policies 
WHERE tablename = 'notifications' 
  AND cmd = 'INSERT';

-- Step 2: Verify the policy allows authenticated users
-- The policy should show:
-- - roles: {authenticated}
-- - with_check: true
-- - cmd: INSERT

-- Step 3: Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'notifications';

-- Step 4: Test insert directly (while logged in as consultant in SQL Editor)
-- This will show the exact error if policy is blocking
-- Replace with actual sales person profile ID
/*
INSERT INTO notifications (recipient_id, message, type)
VALUES (
  '07e9466e-c098-4a0c-9919-7b12afe2569d'::uuid,
  'Direct SQL test',
  'test'
)
RETURNING *;
*/

-- Step 5: If insert fails, check if you're authenticated
SELECT auth.uid() as current_user_id;

-- Step 6: Verify recipient_id exists in profiles
SELECT id, email, role 
FROM profiles 
WHERE id = '07e9466e-c098-4a0c-9919-7b12afe2569d'::uuid;

