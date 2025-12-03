-- Test notification insertion to debug the 403 error
-- Run this in Supabase SQL Editor while logged in as a consultant

-- Step 1: Check your current user ID
SELECT 
  auth.uid() as current_auth_user_id,
  (SELECT id FROM profiles WHERE id = auth.uid()) as profile_id,
  (SELECT role FROM profiles WHERE id = auth.uid()) as your_role;

-- Step 2: Get a sales person's profile ID to test with
-- Replace 'sales' with the actual email or get from profiles table
SELECT id, email, full_name, role 
FROM profiles 
WHERE role = 'sales' 
LIMIT 1;

-- Step 3: Try to insert a test notification
-- Replace 'SALES_PERSON_PROFILE_ID' with the actual profile ID from step 2
INSERT INTO notifications (recipient_id, message, type)
VALUES (
  'SALES_PERSON_PROFILE_ID'::uuid,  -- Replace with actual sales person profile ID
  'Test notification from SQL',
  'test'
)
RETURNING *;

-- Step 4: If step 3 fails, check the exact error
-- The error message will tell us what's wrong

-- Step 5: Verify the recipient_id is a valid profile ID
SELECT 
  n.id as notification_id,
  n.recipient_id,
  p.id as profile_id,
  p.email,
  p.role
FROM notifications n
LEFT JOIN profiles p ON n.recipient_id = p.id
ORDER BY n.created_at DESC
LIMIT 5;

