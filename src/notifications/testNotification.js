/**
 * Test Notification Function
 * 
 * Demonstrates how to insert a notification into Supabase
 * that will trigger a Realtime event and desktop notification.
 */

import { supabase } from '../supabase/client'

/**
 * Send a test notification to a specific user
 * 
 * @param {string} userId - The recipient user ID (must be a valid UUID)
 * @param {string} type - Notification type (optional, defaults to 'test')
 * @param {string} message - Notification message (optional)
 * @returns {Promise<Object>} - The inserted notification record
 */
export async function sendTestNotification(
  userId = null, // Must provide a valid UUID
  type = 'test',
  message = 'This is a realtime test!'
) {
  // Validate userId is provided and is a valid UUID format
  if (!userId) {
    throw new Error('userId is required and must be a valid UUID')
  }
  
  // Basic UUID format validation (8-4-4-4-12 hex characters)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(userId)) {
    throw new Error('userId must be a valid UUID format (e.g., 07e9466e-c098-4a0c-9919-7b12a1234567)')
  }
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: userId,
        type: type,
        message: message,
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    console.log('Test notification sent successfully:', data)
    return data
  } catch (error) {
    console.error('Error sending test notification:', error)
    throw error
  }
}

