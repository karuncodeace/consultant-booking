# Send Notification Edge Function

This Supabase Edge Function sends push notifications to users.

**Note:** This function uses `.ts` extension (required by Supabase CLI) but is written in JavaScript syntax. Deno supports both TypeScript and JavaScript.

## Setup

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Generate VAPID Keys
```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys
```

Save the public and private keys.

### 3. Set Environment Variables
In Supabase Dashboard → Edge Functions → Settings:
- `VAPID_PUBLIC_KEY` - Your VAPID public key
- `VAPID_PRIVATE_KEY` - Your VAPID private key  
- `VAPID_EMAIL` - Your email (e.g., admin@example.com)

### 4. Deploy Function
```bash
supabase functions deploy send-notification
```

## Usage

Call the function from your application:

```javascript
const { data, error } = await supabase.functions.invoke('send-notification', {
  body: {
    recipient_id: 'user-uuid',
    title: 'New Notification',
    body: 'You have a new message',
    data: { /* optional data */ }
  }
})
```

## Note

For production, consider using the `web-push` library properly. The current implementation is a basic version.

