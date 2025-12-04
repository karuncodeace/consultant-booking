/**
 * Desktop Notification Permission Handler
 * 
 * Handles requesting and checking browser notification permissions
 * for desktop notifications using the Web Notifications API.
 */

/**
 * Request notification permission from the user
 * 
 * @returns {Promise<boolean>} - Returns true if permission is granted, false otherwise
 */
export async function requestNotificationPermission() {
  // Check if Notification API is supported
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications')
    return false
  }

  // Check current permission status
  const currentPermission = Notification.permission

  // If already granted, return true
  if (currentPermission === 'granted') {
    return true
  }

  // If already denied, return false
  if (currentPermission === 'denied') {
    console.warn('Notification permission has been denied by the user')
    return false
  }

  // Request permission (default state)
  try {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return false
  }
}

/**
 * Check if notification permission is currently granted
 * 
 * @returns {boolean} - Returns true if permission is granted
 */
export function hasNotificationPermission() {
  if (!('Notification' in window)) {
    return false
  }
  return Notification.permission === 'granted'
}

