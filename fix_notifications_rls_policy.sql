-- Fix RLS Policy for Notifications Table
-- This allows authenticated users to insert notifications for any recipient
-- Run this in Supabase SQL Editor

-- Drop ALL existing insert policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;

-- Create a new policy that allows any authenticated user to insert notifications
-- This is needed so consultants can send notifications to sales people
CREATE POLICY "Allow authenticated users to insert notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;

