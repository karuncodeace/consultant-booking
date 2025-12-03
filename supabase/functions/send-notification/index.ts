// Supabase Edge Function to send push notifications
// Deploy with: supabase functions deploy send-notification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as webpush from 'https://esm.sh/web-push@3.6.7'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') || 'admin@example.com'

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    const { recipient_id, title, body, data } = await req.json()

    if (!recipient_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: recipient_id, title, body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user's push subscription
    const { data: subscriptionData, error: subError } = await supabase
      .from('subscriptions')
      .select('subscription')
      .eq('user_id', recipient_id)
      .single()

    if (subError || !subscriptionData) {
      console.error('No subscription found for user:', recipient_id)
      return new Response(
        JSON.stringify({ error: 'User not subscribed to push notifications' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const subscription = subscriptionData.subscription

    // Set VAPID details
    webpush.setVapidDetails(
      VAPID_EMAIL,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    )

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      body,
      icon: '/vite.svg',
      badge: '/vite.svg',
      data: data || {},
      tag: 'notification',
      requireInteraction: false
    })

    // Send push notification
    try {
      await webpush.sendNotification(
        subscription,
        payload
      )

      console.log('Push notification sent successfully to user:', recipient_id)

      return new Response(
        JSON.stringify({ success: true, message: 'Push notification sent' }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    } catch (pushError) {
      console.error('Error sending push notification:', pushError)
      
      // If subscription is invalid, remove it from database
      if (pushError.statusCode === 410 || pushError.statusCode === 404) {
        await supabase
          .from('subscriptions')
          .delete()
          .eq('user_id', recipient_id)
        
        return new Response(
          JSON.stringify({ error: 'Subscription expired and has been removed' }),
          { status: 410, headers: { 'Content-Type': 'application/json' } }
        )
      }

      throw pushError
    }
  } catch (error) {
    console.error('Error in send-notification function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
  }
})

