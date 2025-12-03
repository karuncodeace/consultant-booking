import { supabase } from './supabaseClient'

// VAPID public key - Replace with your actual VAPID public key
// Generate at: https://web-push-codelab.glitch.me/ or using web-push library
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

/**
 * Convert VAPID public key from base64 URL to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

/**
 * Subscribe user to push notifications
 */
export async function subscribeUser() {
    try {
        // Check if browser supports notifications
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications')
            return null
        }

        // Check if service workers are supported
        if (!('serviceWorker' in navigator)) {
            console.log('This browser does not support service workers')
            return null
        }

        // 1. Request permission
        const permission = await Notification.requestPermission()
        
        if (permission !== 'granted') {
            console.log('Notification permission denied')
            return null
        }

        // 2. Register Service Worker
        const registration = await navigator.serviceWorker.register('/service-worker.js')
        console.log('Service Worker registered:', registration)

        // Wait for service worker to be ready
        await navigator.serviceWorker.ready

        // 3. Subscribe to push
        if (!VAPID_PUBLIC_KEY) {
            console.warn('VAPID_PUBLIC_KEY not set. Please set VITE_VAPID_PUBLIC_KEY in .env file')
            return null
        }

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })

        console.log('Push subscription created:', subscription)

        // 4. Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            console.log('No user logged in, cannot save subscription')
            return subscription
        }

        // 5. Save subscription in Supabase
        const { error } = await supabase
            .from('subscriptions')
            .upsert({
                user_id: user.id,
                subscription: subscription.toJSON(),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            })

        if (error) {
            console.error('Error saving subscription:', error)
        } else {
            console.log('Subscription saved successfully')
        }

        return subscription
    } catch (error) {
        console.error('Error subscribing to push notifications:', error)
        return null
    }
}

/**
 * Unsubscribe user from push notifications
 */
export async function unsubscribeUser() {
    try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()

        if (subscription) {
            await subscription.unsubscribe()
            console.log('Unsubscribed from push notifications')
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            // Remove subscription from database
            await supabase
                .from('subscriptions')
                .delete()
                .eq('user_id', user.id)
        }
    } catch (error) {
        console.error('Error unsubscribing from push notifications:', error)
    }
}

/**
 * Check if user is subscribed
 */
export async function isSubscribed() {
    try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        return subscription !== null
    } catch (error) {
        console.error('Error checking subscription:', error)
        return false
    }
}

