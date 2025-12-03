-- Final Fix for Notifications RLS Policy
-- This ensures the INSERT policy works correctly
-- Run this in Supabase SQL Editor

-- Step 1: Drop the INSERT policy specifically
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;

-- Step 2: Create the INSERT policy with explicit syntax
-- This allows ANY authenticated user to insert notifications for ANY recipient
CREATE POLICY "Allow authenticated users to insert notifications" 
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Step 3: Verify it was created
SELECT 
  policyname,
  cmd,
  roles,
  permissive,
  with_check
FROM pg_policies 
WHERE tablename = 'notifications' 
  AND cmd = 'INSERT';

-- Step 4: Test the policy (run this while logged in as consultant)
-- First, get a sales person's profile ID:
SELECT id, email, full_name, role 
FROM profiles 
WHERE role = 'sales' 
LIMIT 1;

-- Then try inserting (replace with actual profile ID from above):
/*
INSERT INTO notifications (recipient_id, message, type)
VALUES (
  'PASTE_SALES_PERSON_PROFILE_ID_HERE'::uuid,
  'Test notification',
  'test'
)
RETURNING *;
*/

