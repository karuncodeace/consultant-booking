import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import { Bell } from 'lucide-react'

const NotificationContext = createContext({})

export const useNotification = () => useContext(NotificationContext)

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth()
    const [toasts, setToasts] = useState([])

    useEffect(() => {
        if (!user) return

        const subscription = supabase
            .channel('global_notifications')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests' }, (payload) => {
                const newData = payload.new
                const oldData = payload.old
                
                // Notify sales person if their request status changed
                if (user.id === newData.created_by && oldData && oldData.status !== newData.status) {
                    let message = ''
                    if (newData.status === 'approved') {
                        message = `Request for "${newData.client_name}" has been approved`
                    } else if (newData.status === 'rejected') {
                        message = `Request for "${newData.client_name}" has been rejected`
                    } else if (newData.status === 'rescheduled' && newData.requested_date && newData.requested_time) {
                        message = `Request for "${newData.client_name}" has been rescheduled to ${newData.requested_date} at ${newData.requested_time}`
                    } else if (newData.status) {
                        message = `Request for "${newData.client_name}" status changed to ${newData.status}`
                    }
                    if (message) {
                        addToast(message)
                    }
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests' }, (payload) => {
                const newData = payload.new
                if (user.id === newData.consultant_id) {
                    addToast(`New request received for ${newData.client_name}`)
                }
            })
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [user])

    const addToast = (message) => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message }])
        setTimeout(() => removeToast(id), 5000)
    }

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }

    return (
        <NotificationContext.Provider value={{ addToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-5 right-5 z-50 space-y-3">
                {toasts.map(toast => (
                    <div key={toast.id} className="max-w-xs bg-white border border-gray-200 rounded-xl shadow-lg" role="alert">
                        <div className="flex p-4">
                            <div className="flex-shrink-0">
                                <Bell className="h-4 w-4 text-blue-500 mt-0.5" />
                            </div>
                            <div className="ms-3">
                                <p className="text-sm text-gray-700">
                                    {toast.message}
                                </p>
                            </div>
                            <div className="ms-auto ps-3">
                                <button onClick={() => removeToast(toast.id)} className="inline-flex flex-shrink-0 justify-center items-center h-5 w-5 rounded-lg text-gray-800 opacity-50 hover:opacity-100 focus:outline-none focus:opacity-100">
                                    <span className="sr-only">Close</span>
                                    <svg className="flex-shrink-0 w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    )
}
