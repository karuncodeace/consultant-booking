# Desktop Notification Testing Guide

Complete guide to test the React.js + Supabase Realtime desktop notification system.

## 📋 Prerequisites

### 1. Environment Variables Setup

Create a `.env` file in the root directory (or add to your existing `.env`):

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Where to find these:**
- Go to your Supabase Dashboard
- Navigate to **Settings** → **API**
- Copy the **Project URL** and **anon public** key

### 2. Supabase Table Setup

Ensure your `notifications` table exists with the following structure:

```sql
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id TEXT NOT NULL,
  title TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Enable Realtime

1. Go to Supabase Dashboard → **Database** → **Replication**
2. Find the `notifications` table
3. Toggle **Realtime** to **ON**
4. Make sure **INSERT** events are enabled

## 🧪 Testing Methods

### Method 1: Using the Test Component (Recommended)

1. **Add the test component to any dashboard:**

   Import and add `NotificationTestPanel` to any dashboard page:

   ```jsx
   // In AdminDashboard.jsx, ConsultantDashboard.jsx, or SalesDashboard.jsx
   import NotificationTestPanel from '../components/NotificationTestPanel'
   
   // Add inside your component's return:
   <NotificationTestPanel />
   ```

2. **Run your app:**
   ```bash
   npm run dev
   ```

3. **Test steps:**
   - Navigate to a dashboard page
   - You'll see the "Desktop Notification Test" panel
   - Click "Request Permission" (if needed)
   - Click "Send Test Notification"
   - A desktop notification should appear!

### Method 2: Browser Console Testing

1. **Open your app in the browser** (make sure it's running)

2. **Open Browser DevTools** (F12) and go to the Console tab

3. **Test permission:**
   ```javascript
   // Import the function (if using ES modules in console)
   // Or test directly:
   const permission = await Notification.requestPermission()
   console.log('Permission:', permission)
   ```

4. **Send a test notification via console:**
   ```javascript
   // You can use the sendTestNotification function
   // Or directly insert into Supabase:
   
   import { supabase } from './src/supabase/client.js'
   
   const { data, error } = await supabase
     .from('notifications')
     .insert({
       recipient_id: 'USER-ID-TEST',
       title: 'Console Test',
       message: 'Testing from browser console!'
     })
   ```

### Method 3: Direct Supabase Insert

1. **Via Supabase Dashboard:**
   - Go to **Table Editor** → `notifications`
   - Click **Insert** → **Insert row**
   - Fill in:
     - `recipient_id`: `USER-ID-TEST`
     - `title`: `Test from Dashboard`
     - `message`: `This is a test!`
   - Click **Save**
   - Desktop notification should appear!

2. **Via SQL Editor:**
   ```sql
   INSERT INTO notifications (recipient_id, title, message)
   VALUES ('USER-ID-TEST', 'SQL Test', 'Testing from SQL editor!');
   ```

3. **Via API/Backend:**
   ```javascript
   // From your backend or another service
   const { data, error } = await supabase
     .from('notifications')
     .insert({
       recipient_id: 'USER-ID-TEST',
       title: 'Backend Test',
       message: 'Notification from backend!'
     })
   ```

## ✅ Verification Checklist

- [ ] Environment variables are set correctly
- [ ] Supabase table `notifications` exists
- [ ] Realtime is enabled for `notifications` table
- [ ] Browser notification permission is granted
- [ ] App is subscribed to notifications (check console logs)
- [ ] Test notification appears on desktop

## 🔍 Troubleshooting

### No notification appears

1. **Check browser console for errors:**
   - Open DevTools (F12) → Console
   - Look for any red error messages

2. **Verify permission:**
   ```javascript
   console.log('Permission:', Notification.permission)
   // Should be "granted"
   ```

3. **Check Realtime subscription:**
   - Look for console log: `"Successfully subscribed to notifications for user: USER-ID-TEST"`
   - If missing, check Supabase connection

4. **Verify Supabase Realtime:**
   - Go to Supabase Dashboard → Database → Replication
   - Ensure `notifications` table has Realtime enabled
   - Check that INSERT events are enabled

5. **Check network:**
   - Open DevTools → Network tab
   - Look for WebSocket connections (should see `realtime` connection)

### Permission denied

- **Chrome/Edge:** Check site settings (lock icon in address bar)
- **Firefox:** Check site permissions in browser settings
- **Safari:** May require user interaction to request permission

### Realtime not connecting

1. **Check environment variables:**
   ```javascript
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
   console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY)
   ```

2. **Verify Supabase project is active:**
   - Check Supabase Dashboard
   - Ensure project is not paused

3. **Check browser console for WebSocket errors**

## 🎯 Expected Behavior

1. **On app load:**
   - Permission request dialog appears (if not already granted)
   - Console log: `"Desktop notification permission granted"`

2. **After subscription:**
   - Console log: `"Successfully subscribed to notifications for user: USER-ID-TEST"`

3. **When notification is inserted:**
   - Desktop notification popup appears
   - Shows title and message
   - Auto-closes after 5 seconds

## 📝 Testing Different Scenarios

### Test with different user IDs:
```javascript
await sendTestNotification('different-user-id', 'Title', 'Message')
```

### Test multiple notifications:
```javascript
// Send multiple in quick succession
for (let i = 1; i <= 5; i++) {
  await sendTestNotification(
    'USER-ID-TEST',
    `Notification ${i}`,
    `This is notification number ${i}`
  )
  await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
}
```

### Test notification click:
- Click on a desktop notification
- Browser window should focus

## 🚀 Production Checklist

Before deploying to production:

- [ ] Replace `USER-ID-TEST` with actual user IDs from authentication
- [ ] Update notification icon path (`/notification-icon.png`)
- [ ] Add proper error handling for production
- [ ] Test with real user authentication flow
- [ ] Monitor Supabase Realtime connection limits
- [ ] Set up proper notification cleanup/unsubscribe logic

## 📚 Additional Resources

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Web Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)

