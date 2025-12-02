# Notification System Troubleshooting Guide

## Quick Checklist

### 1. ✅ Verify Realtime is Enabled
Run this in Supabase SQL Editor:
```sql
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';
```
**Expected:** Should return 1 row. If empty, realtime is NOT enabled.

**Fix:** Run `ALTER PUBLICATION supabase_realtime ADD TABLE notifications;`

### 2. ✅ Check Browser Console
Open Developer Tools (F12) and look for:
- `✅ Successfully subscribed to notifications realtime` - Good!
- `❌ Channel subscription error` - Realtime not enabled
- `New notification received via realtime:` - Working!

### 3. ✅ Test Notification Insertion
1. Open Sales Dashboard
2. Click the yellow "Test" button (development mode only)
3. Check console for errors
4. Notification should appear instantly

### 4. ✅ Verify Database Permissions
Check RLS policies are correct:
```sql
-- Should return policies for notifications table
SELECT * FROM pg_policies WHERE tablename = 'notifications';
```

### 5. ✅ Check Notification Insertion
When consultant approves, check console for:
- `Inserting notification:` - Shows data being sent
- `Notification inserted successfully:` - Database insert worked
- `Error inserting notification:` - Permission/RLS issue

## Common Issues & Solutions

### Issue: "Channel subscription error"
**Cause:** Realtime replication not enabled
**Solution:** Enable in Dashboard → Database → Replication → Toggle ON for notifications

### Issue: "Error inserting notification"
**Cause:** RLS policy blocking insert
**Solution:** Check `Authenticated users can insert notifications` policy exists

### Issue: Notifications insert but don't appear
**Cause:** Subscription filter not matching
**Solution:** Check `user.id` matches `recipient_id` in database

### Issue: No console logs at all
**Cause:** Subscription not set up
**Solution:** Check useEffect dependencies and user.id is available

## Manual Test Steps

1. **Open Sales Dashboard** - Check console shows subscription status
2. **Open Consultant Dashboard** - As different user
3. **Approve a request** - Check console for "Inserting notification"
4. **Check Sales Dashboard** - Should see toast + badge update

## Debug Commands

### Check if notifications table exists:
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'notifications';
```

### Check recent notifications:
```sql
SELECT * FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check RLS policies:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'notifications';
```

### Verify realtime:
```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

