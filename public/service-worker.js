// Service Worker for Push Notifications
self.addEventListener('push', function (event) {
    console.log('Push notification received:', event)
    
    let data = {
        title: 'New Notification',
        body: 'You have a new notification',
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: 'notification',
        requireInteraction: false
    }

    if (event.data) {
        try {
            const payload = event.data.json()
            data = {
                title: payload.title || data.title,
                body: payload.body || payload.message || data.body,
                icon: payload.icon || data.icon,
                badge: payload.badge || data.badge,
                tag: payload.tag || data.tag,
                data: payload.data || {},
                requireInteraction: payload.requireInteraction || false
            }
        } catch (e) {
            console.error('Error parsing push data:', e)
            const text = event.data.text()
            if (text) {
                data.body = text
            }
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            tag: data.tag,
            data: data.data,
            requireInteraction: data.requireInteraction,
            vibrate: [200, 100, 200],
            actions: [
                {
                    action: 'open',
                    title: 'Open App'
                },
                {
                    action: 'close',
                    title: 'Close'
                }
            ]
        })
    )
})

// Handle notification click
self.addEventListener('notificationclick', function (event) {
    console.log('Notification clicked:', event)
    
    event.notification.close()

    if (event.action === 'close') {
        return
    }

    // Open the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // If app is already open, focus it
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i]
                if ('focus' in client) {
                    return client.focus()
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow('/')
            }
        })
    )
})

// Handle notification close
self.addEventListener('notificationclose', function (event) {
    console.log('Notification closed:', event)
})

  