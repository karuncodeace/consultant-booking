-- Comprehensive RLS Policy Fix for Notifications
-- Run this in Supabase SQL Editor

-- Step 1: Check current policies
SELECT 
  policyname,
  cmd,
  roles,
  permissive,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;

-- Step 2: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- Step 3: Recreate all policies with correct syntax
-- SELECT: Users can only view their own notifications
-- Note: recipient_id references profiles(id), and profiles.id = auth.users.id (same UUID)
-- So auth.uid() should equal recipient_id when viewing own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  USING (auth.uid() = recipient_id);

-- INSERT: Any authenticated user can insert notifications
-- This allows consultants to send notifications to sales people
CREATE POLICY "Allow authenticated users to insert notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Users can only update their own notifications
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- DELETE: Users can only delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE
  USING (auth.uid() = recipient_id);

-- Step 4: Verify policies were created correctly
SELECT 
  policyname,
  cmd,
  roles,
  permissive,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;

-- Step 5: Test insert (replace with actual IDs)
-- Uncomment and run this to test:
/*
INSERT INTO notifications (recipient_id, message, type)
VALUES (
  'YOUR_SALES_PERSON_PROFILE_ID'::uuid,
  'Test notification from SQL',
  'test'
)
RETURNING *;
*/

