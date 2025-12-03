# Testing Push Notifications Guide

## Prerequisites Checklist

Before testing, ensure:
- ✅ VAPID keys are set in `.env` file (`VITE_VAPID_PUBLIC_KEY`)
- ✅ VAPID secrets are set in Supabase (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`)
- ✅ `subscriptions` table exists in database
- ✅ Edge Function `send-notification` is deployed
- ✅ Service worker is registered

## Step 1: Test User Subscription

### As Sales Person:

1. **Open the app in browser** (preferably Chrome/Edge for best support)
2. **Log in as a sales person**
3. **Open Browser DevTools** (F12)
4. **Go to Console tab**
5. **Look for these messages:**
   ```
   Service Worker registered: ServiceWorkerRegistration {...}
   Push subscription created: PushSubscription {...}
   Subscription saved successfully
   ```

6. **Check if permission was requested:**
   - Browser should show notification permission prompt
   - Click "Allow"

7. **Verify subscription in database:**
   - Go to Supabase Dashboard → Database → `subscriptions` table
   - You should see a row with your user_id and subscription JSON

## Step 2: Test Edge Function Directly

### Using Supabase Dashboard:

1. Go to **Supabase Dashboard → Edge Functions → send-notification**
2. Click **"Invoke Function"** or use the test button
3. Use this test payload:
   ```json
   {
     "recipient_id": "your-sales-user-id-here",
     "title": "Test Notification",
     "body": "This is a test push notification",
     "data": {
       "type": "test",
       "requestId": "test-123"
     }
   }
   ```
4. Click **"Invoke"**
5. Check browser - you should see a push notification!

### Using cURL (Terminal):

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "recipient_id": "your-sales-user-id-here",
    "title": "Test Notification",
    "body": "This is a test push notification",
    "data": {"type": "test"}
  }'
```

## Step 3: Test End-to-End Flow

### Complete Workflow Test:

1. **Open two browser windows/tabs:**
   - **Window 1:** Log in as **Sales Person** (keep this open)
   - **Window 2:** Log in as **Consultant**

2. **In Sales Person window:**
   - Open DevTools Console (F12)
   - Make sure you see "Subscription saved successfully"
   - Keep console open to see notifications

3. **In Consultant window:**
   - Go to Consultant Dashboard
   - Find a pending request
   - Click **"Approve"** button

4. **Check Sales Person window:**
   - ✅ **Toast notification** should appear (via react-hot-toast)
   - ✅ **Browser push notification** should appear (native notification)
   - ✅ Console should show: "New notification received via realtime"

5. **Test Reject with Reschedule:**
   - In Consultant window, click **"Reject"**
   - Fill in reschedule form (date, from_time, to_time, message)
   - Click **"Confirm Reschedule"**
   - Sales Person should receive notification about reschedule

## Step 4: Verify Database

### Check Notifications Table:

```sql
-- View recent notifications
SELECT * FROM notifications 
WHERE recipient_id = 'your-sales-user-id'
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Subscriptions Table:

```sql
-- View all subscriptions
SELECT 
  id,
  user_id,
  created_at,
  subscription->>'endpoint' as endpoint
FROM subscriptions;
```

## Step 5: Test Edge Cases

### Test 1: User Not Subscribed
- Delete subscription from database
- Try to send notification
- Should return 404 error (user not subscribed)

### Test 2: Invalid Subscription
- Manually corrupt subscription JSON in database
- Try to send notification
- Edge Function should handle error gracefully

### Test 3: Browser Closed
- Close the browser completely
- Send a notification via Edge Function
- Browser should show notification even when closed (if permission granted)

## Step 6: Debugging

### Check Service Worker:
1. Open DevTools → **Application** tab
2. Go to **Service Workers**
3. Verify `service-worker.js` is registered and active

### Check Push Subscription:
1. Open DevTools → **Application** tab
2. Go to **Storage** → **IndexedDB**
3. Look for push subscription data

### Check Console Errors:
- Look for any red errors in console
- Common issues:
  - `VAPID_PUBLIC_KEY not set` → Add to `.env` file
  - `Service Worker registration failed` → Check `public/service-worker.js` exists
  - `403 Forbidden` → Check RLS policies on `subscriptions` table
  - `404 Not Found` → User not subscribed

### Check Edge Function Logs:
1. Go to **Supabase Dashboard → Edge Functions → send-notification**
2. Click **"Logs"** tab
3. Look for errors or successful sends

## Step 7: Browser-Specific Testing

### Chrome/Edge:
- ✅ Full support
- ✅ Works on localhost (HTTP)
- ✅ Requires HTTPS in production

### Firefox:
- ✅ Full support
- ✅ Works on localhost (HTTP)
- ✅ Requires HTTPS in production

### Safari:
- ⚠️ Limited support
- ⚠️ Requires macOS/iOS
- ⚠️ May need additional configuration

## Quick Test Script

Run this in browser console (as Sales Person):

```javascript
// Test subscription
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.getSubscription();
console.log('Subscription:', subscription);

// Test notification permission
const permission = await Notification.requestPermission();
console.log('Permission:', permission);

// Test sending notification (replace with your user ID)
const response = await fetch('https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-notification', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ANON_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    recipient_id: 'YOUR_USER_ID',
    title: 'Test',
    body: 'Testing push notification',
    data: { type: 'test' }
  })
});
const result = await response.json();
console.log('Result:', result);
```

## Success Indicators

✅ **Subscription Working:**
- Console shows "Subscription saved successfully"
- Row exists in `subscriptions` table

✅ **Edge Function Working:**
- Function deploys without errors
- Logs show successful sends
- Returns 200 status

✅ **Push Notifications Working:**
- Browser shows native notifications
- Notifications appear even when browser is closed
- Clicking notification opens the app

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No permission prompt | Check browser settings, clear site data |
| Subscription not saved | Check RLS policies, verify user is logged in |
| Edge Function 500 error | Check VAPID secrets are set correctly |
| No push notification | Check service worker is active, verify subscription |
| 404 on Edge Function | Check function name, verify deployment |

## Next Steps

Once testing is successful:
1. Remove test notifications from database
2. Test with real booking requests
3. Monitor Edge Function logs for errors
4. Set up monitoring/alerts if needed

