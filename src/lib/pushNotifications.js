import { requestPermissionAndToken } from '../firebase'
import { supabase } from './supabaseClient'

/**
 * Subscribe user to push notifications using Firebase Cloud Messaging
 * This function requests permission, gets the FCM token, and saves it to the database
 */
export async function subscribeUser() {
  try {
    console.log('🔄 Subscribing to push notifications...')
    
    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers are not supported in this browser')
      return
    }

    // Request permission and get FCM token using Firebase
    const token = await requestPermissionAndToken()
    
    if (!token) {
      console.warn('Failed to get FCM token - user may have denied permission')
      return
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.warn('No user logged in - cannot subscribe to push notifications')
      return
    }

    // Save subscription to database
    // Note: Adjust the table name and structure based on your database schema
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        fcm_token: token,
        subscription: null, // For web push API compatibility, but we're using FCM
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('Error saving FCM token to database:', error)
      throw error
    }

    console.log('✅ Successfully subscribed to push notifications')
    return token
  } catch (error) {
    console.error('Error subscribing to push notifications:', error)
    // Push notifications are optional - app will continue to work without them
    throw error
  }
}


