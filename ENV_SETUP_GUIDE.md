# Environment Variables Setup Guide

## Client-Side (.env file)

**ONLY** the public key should be in your `.env` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# VAPID Public Key (ONLY public key - safe to expose)
VITE_VAPID_PUBLIC_KEY=BCX27y2KHnwYZP-_xYplAyZuSRwDz_JtaBR1fflcXEKIqChl4iK6_nOggNZElNOGwrJ64EZdsmrKQITjrgbBLLM
```

## Server-Side (Supabase Edge Function Secrets)

The **private key** and email should ONLY be in Supabase secrets:

```bash
# Set these in Supabase (NOT in .env file)
npx supabase secrets set VAPID_PUBLIC_KEY=BCX27y2KHnwYZP-_xYplAyZuSRwDz_JtaBR1fflcXEKIqChl4iK6_nOggNZElNOGwrJ64EZdsmrKQITjrgbBLLM
npx supabase secrets set VAPID_PRIVATE_KEY=BKKGvXju4PJajgXGrSAB3BWAiJI1M5RRbUhxSKUwxcM
npx supabase secrets set VAPID_EMAIL=karun@codeace.com
```

## Security Warning

⚠️ **NEVER** put the private key in:
- `.env` file (client-side)
- Git repository
- Client-side code
- Public places

The private key should ONLY be in:
- Supabase Edge Function secrets
- Server-side environment variables
- Secure secret management systems

## Your Current Setup

Based on your keys:
- ✅ Public Key: Correct format and length
- ⚠️ Private Key: Remove from `.env` file (security risk)
- ⚠️ VAPID_EMAIL: Not needed in `.env` (only needed in Supabase secrets)

## Corrected .env File

Your `.env` should only have:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_VAPID_PUBLIC_KEY=BCX27y2KHnwYZP-_xYplAyZuSRwDz_JtaBR1fflcXEKIqChl4iK6_nOggNZElNOGwrJ64EZdsmrKQITjrgbBLLM
```

Remove:
- `VITE_VAPID_PRIVATE_KEY` (should be in Supabase secrets only)
- `VAPID_EMAIL` (should be in Supabase secrets only)

