-- Create subscriptions table for push notifications
-- Run this in Supabase SQL Editor

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
  subscription jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running this script)
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON subscriptions;

-- Subscriptions policies
-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own subscriptions
CREATE POLICY "Users can insert own subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions" ON subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);

-- Verify the table was created
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;

