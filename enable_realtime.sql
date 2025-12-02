-- Enable Realtime Replication for notifications table
-- Run this in Supabase SQL Editor

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Verify it's enabled (optional check)
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';

