/**
 * Realtime Notification Subscription Service
 * 
 * Subscribes to Supabase Realtime changes on the notifications table
 * and displays desktop notifications when new records are inserted.
 */

import { supabase } from '../supabase/client'
import { hasNotificationPermission } from './desktopNotifications'

// Track active subscriptions to prevent duplicates
const activeSubscriptions = new Map()

/**
 * Subscribe to notifications for a specific user
 * 
 * @param {string} userId - The user ID to filter notifications by
 * @returns {RealtimeChannel} - The Supabase Realtime channel instance
 */
export function subscribeToNotifications(userId) {
  // Validate userId
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required to subscribe to notifications')
  }

  // Check if already subscribed for this user
  const subscriptionKey = `notifications_${userId}`
  if (activeSubscriptions.has(subscriptionKey)) {
    console.warn(`Already subscribed to notifications for user: ${userId}`)
    return activeSubscriptions.get(subscriptionKey)
  }

  // Check notification permission before subscribing
  if (!hasNotificationPermission()) {
    console.warn('Notification permission not granted. Desktop notifications will not be shown.')
  }

  // Create Realtime channel for notifications table
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`
      },
      (payload) => {
        handleNewNotification(payload.new)
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Successfully subscribed to notifications for user: ${userId}`)
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Error subscribing to notifications for user: ${userId}`)
      }
    })

  // Store subscription
  activeSubscriptions.set(subscriptionKey, channel)

  return channel
}

/**
 * Handle new notification from Realtime
 * 
 * @param {Object} record - The new notification record
 */
function handleNewNotification(record) {
  // Check permission before showing notification
  if (!hasNotificationPermission()) {
    console.warn('Cannot show notification: permission not granted')
    return
  }

  // Extract notification data
  // Use 'type' as title and 'message' as body (matching your table schema)
  const title = record.type || 'New Notification'
  const message = record.message || ''
  const icon = '/notification-icon.png'

  // Show desktop notification
  try {
    const notification = new Notification(title, {
      body: message,
      icon: icon,
      badge: icon,
      tag: `notification-${record.id}`, // Prevent duplicate notifications
      requireInteraction: false,
      silent: false
    })

    // Optional: Handle notification click
    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close()
    }, 5000)
  } catch (error) {
    console.error('Error showing desktop notification:', error)
  }
}

/**
 * Unsubscribe from notifications channel
 * 
 * @param {RealtimeChannel} channel - The channel instance to unsubscribe from
 */
export function unsubscribe(channel) {
  if (!channel) {
    console.warn('Cannot unsubscribe: invalid channel provided')
    return
  }

  try {
    // Unsubscribe from Supabase
    supabase.removeChannel(channel)

    // Remove from active subscriptions tracking
    for (const [key, value] of activeSubscriptions.entries()) {
      if (value === channel) {
        activeSubscriptions.delete(key)
        console.log(`Unsubscribed from notifications: ${key}`)
        break
      }
    }
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error)
  }
}

/**
 * Unsubscribe all active notification subscriptions
 */
export function unsubscribeAll() {
  activeSubscriptions.forEach((channel, key) => {
    unsubscribe(channel)
  })
}

