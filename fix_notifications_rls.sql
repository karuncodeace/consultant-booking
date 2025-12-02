-- Fix RLS Policies for Notifications Table
-- Run this in Supabase SQL Editor to fix the 403 error

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;

-- Create a new policy that allows any authenticated user to insert notifications
-- This is needed so consultants can send notifications to sales people
CREATE POLICY "Allow authenticated users to insert notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'notifications';

-- Test: This should work now
-- INSERT INTO notifications (recipient_id, message, type)
-- VALUES ('your-user-id-here', 'Test notification', 'approved');

