/**
 * Notification Test Panel Component
 * 
 * A simple UI component to test desktop notifications.
 * Add this to any dashboard page to test the notification system.
 */

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { sendTestNotification } from '../notifications/testNotification'
import { requestNotificationPermission, hasNotificationPermission } from '../notifications/desktopNotifications'
import { Bell, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function NotificationTestPanel() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [permissionStatus, setPermissionStatus] = useState(hasNotificationPermission())

  const handleRequestPermission = async () => {
    setLoading(true)
    try {
      const granted = await requestNotificationPermission()
      setPermissionStatus(granted)
      setStatus({
        type: granted ? 'success' : 'warning',
        message: granted 
          ? 'Notification permission granted!' 
          : 'Notification permission denied or not supported'
      })
    } catch (error) {
      setStatus({
        type: 'error',
        message: `Error: ${error.message}`
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendTest = async () => {
    if (!user?.id) {
      setStatus({
        type: 'error',
        message: 'You must be logged in to send test notifications'
      })
      return
    }

    setLoading(true)
    setStatus(null)
    try {
      await sendTestNotification(
        user.id, // Use authenticated user's UUID
        'test',
        'This is a test notification! If you see this, Realtime is working! 🎉'
      )
      setStatus({
        type: 'success',
        message: 'Test notification sent! Check your desktop notifications.'
      })
    } catch (error) {
      setStatus({
        type: 'error',
        message: `Error: ${error.message}`
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="text-blue-600" size={24} />
        <h3 className="text-lg font-semibold text-gray-800">Desktop Notification Test</h3>
      </div>

      <div className="space-y-4">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-700">Notification Permission:</span>
          <div className="flex items-center gap-2">
            {permissionStatus ? (
              <>
                <CheckCircle className="text-green-600" size={18} />
                <span className="text-sm font-medium text-green-600">Granted</span>
              </>
            ) : (
              <>
                <XCircle className="text-red-600" size={18} />
                <span className="text-sm font-medium text-red-600">Not Granted</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!permissionStatus && (
            <button
              onClick={handleRequestPermission}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Requesting...' : 'Request Permission'}
            </button>
          )}
          <button
            onClick={handleSendTest}
            disabled={loading || !permissionStatus || !user?.id}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sending...' : 'Send Test Notification'}
          </button>
        </div>

        {/* Status Message */}
        {status && (
          <div className={`p-3 rounded-lg flex items-start gap-2 ${
            status.type === 'success' ? 'bg-green-50 text-green-800' :
            status.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
            'bg-red-50 text-red-800'
          }`}>
            {status.type === 'success' && <CheckCircle size={18} className="mt-0.5" />}
            {status.type === 'warning' && <AlertCircle size={18} className="mt-0.5" />}
            {status.type === 'error' && <XCircle size={18} className="mt-0.5" />}
            <p className="text-sm">{status.message}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-200">
          <p><strong>How it works:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Request notification permission (if not already granted)</li>
            <li>Click "Send Test Notification" to insert a notification into Supabase</li>
            <li>If Realtime is working, you should see a desktop notification appear</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

