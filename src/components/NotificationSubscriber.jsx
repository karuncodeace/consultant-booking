/**
 * Notification Subscriber Component
 * 
 * Handles subscribing to desktop notifications when user is authenticated.
 * This component needs to be inside AuthProvider to access user data.
 */

import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { subscribeToNotifications, unsubscribe } from '../notifications/subscribeNotifications'

export default function NotificationSubscriber() {
  const { user } = useAuth()
  const notificationChannelRef = useRef(null)

  useEffect(() => {
    // Only subscribe if user is authenticated
    if (!user?.id) {
      return
    }

    // Subscribe to notifications for the authenticated user
    try {
      const channel = subscribeToNotifications(user.id)
      notificationChannelRef.current = channel
      console.log('Subscribed to desktop notifications for user:', user.id)
    } catch (error) {
      console.error('Error subscribing to notifications:', error)
    }

    // Cleanup: unsubscribe on component unmount or when user changes
    return () => {
      if (notificationChannelRef.current) {
        unsubscribe(notificationChannelRef.current)
        notificationChannelRef.current = null
        console.log('Unsubscribed from desktop notifications')
      }
    }
  }, [user?.id])

  // This component doesn't render anything
  return null
}

