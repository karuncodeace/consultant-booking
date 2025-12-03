# Browser Push Notifications Setup Guide

## Overview
This guide will help you set up browser push notifications for your consultant booking app.

## Step 1: Generate VAPID Keys

VAPID keys are required for push notifications. Generate them using one of these methods:

### Option A: Using the included script (Easiest)
```bash
npm run generate-vapid-keys
```

This will generate and display your VAPID keys.

### Option B: Using web-push CLI
```bash
npm install -g web-push
web-push generate-vapid-keys
```

### Option C: Online Generator
Visit: https://web-push-codelab.glitch.me/

## Step 2: Set Environment Variables

Create or update your `.env` file:

```env
VITE_VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY_HERE
```

**Important:** Never commit the private key to your repository!

## Step 3: Run Database Migration

Execute this SQL in Supabase SQL Editor (already in `supabase_schema.sql`):

```sql
-- Create subscriptions table
CREATE TABLE subscriptions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
  subscription jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies (already in schema file)
```

## Step 4: Deploy Supabase Edge Function

### Option A: Use npx (No Installation Required) ✅ Recommended

You can use `npx` to run Supabase CLI without installing it globally:

```bash
# Login to Supabase
npx supabase login

# Link your project (get project-ref from Supabase Dashboard URL)
npx supabase link --project-ref your-project-ref

# Set Edge Function secrets
npx supabase secrets set VAPID_PUBLIC_KEY=your_public_key
npx supabase secrets set VAPID_PRIVATE_KEY=your_private_key
npx supabase secrets set VAPID_EMAIL=admin@example.com

# Deploy the function
npx supabase functions deploy send-notification
```

### Option B: Install Supabase CLI

See `INSTALL_SUPABASE_CLI.md` for installation options (Scoop, Chocolatey, or direct download).

## Step 5: Update Notification Sending

The system will automatically:
- ✅ Subscribe users on login
- ✅ Save subscriptions to database
- ✅ Service worker is registered
- ✅ Push notifications will work once Edge Function is deployed

## Step 6: Test Push Notifications

1. **Grant Permission**: When you log in, the browser will ask for notification permission
2. **Check Subscription**: Open browser console and verify subscription is saved
3. **Send Test**: Use the Edge Function to send a test notification

## Calling the Edge Function

When a consultant approves/rejects, call the Edge Function:

```javascript
// In ConsultantDashboard.jsx, after inserting notification
const { data, error } = await supabase.functions.invoke('send-notification', {
  body: {
    recipient_id: salesPersonId,
    title: 'Request Approved',
    body: `Request for "${clientName}" has been approved`,
    data: {
      type: 'approved',
      requestId: request.id
    }
  }
})
```

## Troubleshooting

### "Notification permission denied"
- User needs to grant permission in browser settings
- Some browsers require HTTPS (localhost works for development)

### "Service Worker registration failed"
- Check that `/service-worker.js` is accessible
- Verify service worker is in `public/` folder

### "VAPID_PUBLIC_KEY not set"
- Add `VITE_VAPID_PUBLIC_KEY` to your `.env` file
- Restart dev server after adding env variable

### "Push notification not received"
- Check Edge Function logs in Supabase Dashboard
- Verify subscription exists in database
- Check browser console for errors

## Files Created

- ✅ `src/lib/pushNotifications.js` - Subscription management
- ✅ `public/service-worker.js` - Service worker for push notifications
- ✅ `supabase/functions/send-notification/index.ts` - Edge Function
- ✅ Database schema updated with subscriptions table

## Next Steps

1. Generate VAPID keys
2. Add `VITE_VAPID_PUBLIC_KEY` to `.env`
3. Deploy Edge Function
4. Test notifications!

