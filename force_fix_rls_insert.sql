-- Force fix for notifications INSERT policy
-- Run this in Supabase SQL Editor

-- Step 1: Completely remove all INSERT policies
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON notifications;

-- Step 2: Wait a moment (optional, but helps ensure cleanup)
-- Then create the policy with the most permissive syntax
CREATE POLICY "Allow authenticated users to insert notifications" 
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Step 3: Verify it was created
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
  AND cmd = 'INSERT';

-- Step 4: Test the policy (run while logged in as consultant)
-- Get your current user ID
SELECT auth.uid() as my_user_id;

-- Get a sales person profile ID
SELECT id, email, role 
FROM profiles 
WHERE role = 'sales' 
LIMIT 1;

-- Try inserting (replace with actual sales person profile ID)
-- Uncomment and run:
/*
INSERT INTO public.notifications (recipient_id, message, type)
VALUES (
  '07e9466e-c098-4a0c-9919-7b12afe2569d'::uuid,
  'Test from SQL Editor',
  'test'
)
RETURNING *;
*/

-- If the above INSERT works in SQL Editor but fails in the app,
-- the issue might be with how Supabase client is authenticating.
-- Check that the consultant is properly authenticated in the app.

