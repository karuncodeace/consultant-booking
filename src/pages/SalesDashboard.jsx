import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Calendar, Clock, User, Bell } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SalesDashboard() {
    const { user, signOut } = useAuth()
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [consultants, setConsultants] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [showNotifications, setShowNotifications] = useState(false)
    const [notifications, setNotifications] = useState([])

    // Form State
    const [clientName, setClientName] = useState('')
    const [consultantId, setConsultantId] = useState('')
    const [date, setDate] = useState('')
    const [fromTime, setFromTime] = useState('')
    const [toTime, setToTime] = useState('')
    const [notes, setNotes] = useState('')

    useEffect(() => {
        fetchRequests()
        fetchConsultants()
        fetchNotifications()
        fetchUnreadCount()

        // Realtime subscription for requests
        const requestsChannel = supabase
            .channel('requests_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `created_by=eq.${user.id}` }, (payload) => {
                fetchRequests() // Refresh on change
            })
            .subscribe()

        // Realtime subscription for notifications
        const notificationsChannel = supabase
            .channel(`instant_notifications_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('New notification received via realtime:', payload)
                    const newNotification = payload.new
                    setNotifications(prev => [newNotification, ...prev])
                    setUnreadCount(prev => prev + 1)
                    
                    // Show toast notification
                    if (newNotification.type === 'approved') {
                        toast.success(newNotification.message, {
                            duration: 5000,
                            icon: '✅',
                        })
                    } else if (newNotification.type === 'rejected') {
                        toast.error(newNotification.message, {
                            duration: 5000,
                            icon: '❌',
                        })
                    } else {
                        toast(newNotification.message, {
                            duration: 5000,
                            icon: '📅',
                        })
                    }
                }
            )
            .subscribe((status) => {
                console.log('Notifications channel subscription status:', status)
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully subscribed to notifications realtime')
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Channel subscription error - check if realtime is enabled for notifications table')
                    toast.error('Notification subscription error. Check console for details.')
                } else if (status === 'TIMED_OUT') {
                    console.error('⏱️ Subscription timed out')
                } else if (status === 'CLOSED') {
                    console.log('🔒 Subscription closed')
                }
            })

        // Note: Badge count is already handled in notificationsChannel, so we don't need a separate channel
        // This prevents duplicate increments

        return () => {
            console.log('Cleaning up subscriptions...')
            requestsChannel.unsubscribe()
            notificationsChannel.unsubscribe()
            supabase.removeChannel(requestsChannel)
            supabase.removeChannel(notificationsChannel)
        }
    }, [user.id])

    const fetchNotifications = async () => {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('recipient_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) {
            console.error('Error fetching notifications:', error)
        } else {
            setNotifications(data || [])
        }
    }

    const fetchUnreadCount = async () => {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('recipient_id', user.id)
            .eq('read', false)

        if (error) {
            console.error('Error fetching unread count:', error)
        } else {
            console.log('Unread notifications count:', count)
            setUnreadCount(count || 0)
        }
    }

    // Test function to verify notifications work (can be removed later)
    const testNotification = async () => {
        console.log('Testing notification insertion...')
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                recipient_id: user.id,
                message: 'Test notification - if you see this, notifications are working!',
                type: 'approved'
            })
            .select()

        if (error) {
            console.error('Test notification error:', error)
            toast.error('Test failed: ' + error.message)
        } else {
            console.log('Test notification inserted:', data)
            toast.success('Test notification sent! Check if it appears.')
        }
    }

    const markAllAsRead = async () => {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('recipient_id', user.id)
            .eq('read', false)

        if (error) {
            console.error('Error marking notifications as read:', error)
            toast.error('Failed to mark notifications as read')
        } else {
            setUnreadCount(0)
            setNotifications(prev => prev.map(n => ({ ...n, read: true })))
            toast.success('All notifications marked as read')
        }
    }

    const clearAllNotifications = async () => {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('recipient_id', user.id)

        if (error) {
            console.error('Error clearing notifications:', error)
            toast.error('Failed to clear notifications')
        } else {
            setNotifications([])
            setUnreadCount(0)
            toast.success('All notifications cleared')
        }
    }

    const fetchRequests = async () => {
        const { data, error } = await supabase
            .from('requests')
            .select('*, consultant:profiles!consultant_id(full_name)')
            .eq('created_by', user.id)
            .order('created_at', { ascending: false })

        if (error) console.error('Error fetching requests:', error)
        else setRequests(data)
        setLoading(false)
    }

    const fetchConsultants = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'consultant')

        if (data) setConsultants(data)
    }

    const checkTimeSlotAvailability = async (consultantId, requestedDate, fromTime, toTime) => {
        // Parse the requested times
        const requestedStart = new Date(`${requestedDate}T${fromTime}`)
        const requestedEnd = new Date(`${requestedDate}T${toTime}`)
        const requestedBufferEnd = new Date(requestedEnd.getTime() + 20 * 60 * 1000) // Add 20 minutes buffer after slot

        // Validate from_time < to_time
        if (requestedStart >= requestedEnd) {
            return { available: false, message: 'End time must be after start time' }
        }

        // Check for existing approved or pending bookings for this consultant on the SAME DATE ONLY
        const { data: existingBookings, error } = await supabase
            .from('requests')
            .select('requested_date, from_time, to_time, status')
            .eq('consultant_id', consultantId)
            .eq('requested_date', requestedDate) // Only check same date - different dates are allowed
            .in('status', ['pending', 'approved'])

        if (error) {
            console.error('Error checking availability:', error)
            return { available: false, message: 'Error checking availability' }
        }

        // Check if there's any conflict on the same date
        for (const booking of existingBookings || []) {
            // Use from_time and to_time if available, otherwise fallback to requested_time
            const bookingFromTime = booking.from_time || booking.requested_time || '00:00'
            const bookingToTime = booking.to_time || (() => {
                // Calculate to_time from requested_time + 1 hour if not available
                const [hours, minutes] = (booking.requested_time || '00:00').split(':').map(Number)
                const endTime = new Date()
                endTime.setHours(hours + 1, minutes, 0, 0)
                return `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`
            })()

            const bookingStart = new Date(`${booking.requested_date}T${bookingFromTime}`)
            const bookingEnd = new Date(`${booking.requested_date}T${bookingToTime}`)
            const bookingBufferEnd = new Date(bookingEnd.getTime() + 20 * 60 * 1000) // 20 min buffer after booking

            // Check for any overlap or conflict:
            // 1. Requested slot starts before booking but ends during booking or buffer
            // 2. Requested slot starts during booking or buffer
            // 3. Requested slot completely contains the booking
            const requestedStartsBeforeAndOverlaps = requestedStart < bookingStart && requestedBufferEnd > bookingStart
            const requestedStartsDuringBooking = requestedStart >= bookingStart && requestedStart < bookingBufferEnd
            const requestedEndsDuringBooking = requestedEnd > bookingStart && requestedEnd <= bookingBufferEnd
            const requestedContainsBooking = requestedStart <= bookingStart && requestedBufferEnd >= bookingBufferEnd

            if (requestedStartsBeforeAndOverlaps || requestedStartsDuringBooking || requestedEndsDuringBooking || requestedContainsBooking) {
                // Calculate the next available time (booking end + 20 min buffer)
                const nextAvailable = new Date(bookingBufferEnd)
                const nextHour = String(nextAvailable.getHours()).padStart(2, '0')
                const nextMinute = String(nextAvailable.getMinutes()).padStart(2, '0')
                const nextAvailableTime = `${nextHour}:${nextMinute}`
                
                return {
                    available: false,
                    message: `This consultant is already booked from ${bookingFromTime} to ${bookingToTime} on this date. Please choose a time after ${nextAvailableTime} (with 20-minute buffer).`
                }
            }
        }

        return { available: true }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!consultantId || !date || !fromTime || !toTime) {
            alert('Please fill in all required fields')
            return
        }

        // Validate times
        if (fromTime >= toTime) {
            alert('End time must be after start time')
            return
        }

        // Check time slot availability (only checks same date)
        const availability = await checkTimeSlotAvailability(consultantId, date, fromTime, toTime)
        
        if (!availability.available) {
            alert(availability.message)
            return
        }

        const { error } = await supabase
            .from('requests')
            .insert([
                {
                    created_by: user.id,
                    client_name: clientName,
                    consultant_id: consultantId,
                    requested_date: date,
                    from_time: fromTime,
                    to_time: toTime,
                    requested_time: fromTime, // Keep for backward compatibility
                    notes: notes,
                    status: 'pending'
                }
            ])

        if (error) {
            alert('Error creating request: ' + error.message)
        } else {
            setShowModal(false)
            // Reset form
            setClientName('')
            setConsultantId('')
            setDate('')
            setFromTime('')
            setToTime('')
            setNotes('')
        }
    }

    // Close notifications dropdown when clicking outside
    useEffect(() => {
        if (!showNotifications) return

        const handleClickOutside = (event) => {
            const notificationButton = document.querySelector('[data-notification-button]')
            const notificationDropdown = document.querySelector('[data-notification-dropdown]')
            
            if (notificationButton && notificationDropdown) {
                if (!notificationButton.contains(event.target) && !notificationDropdown.contains(event.target)) {
                    setShowNotifications(false)
                }
            }
        }
        
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showNotifications])

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Sales Dashboard</h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Welcome, {user.email}</span>
                    
                    {/* Test Notification Button (for debugging - remove in production) */}
                    {process.env.NODE_ENV === 'development' && (
                        <button
                            onClick={testNotification}
                            className="text-xs px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                            title="Test notification"
                        >
                            Test
                        </button>
                    )}
                    
                    {/* Notification Bell with Badge */}
                    <div className="relative">
                        <button
                            data-notification-button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <Bell className="w-6 h-6" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notifications Dropdown */}
                        {showNotifications && (
                            <div 
                                data-notification-dropdown
                                className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col"
                            >
                                <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-800">Notifications</h3>
                                    <div className="flex gap-2">
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={markAllAsRead}
                                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                        <button
                                            onClick={clearAllNotifications}
                                            className="text-xs text-red-600 hover:text-red-800 font-medium"
                                        >
                                            Clear all
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-y-auto flex-1">
                                    {notifications.length === 0 ? (
                                        <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                            No notifications
                                        </div>
                                    ) : (
                                        notifications.map((notification) => (
                                            <div
                                                key={notification.id}
                                                className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${
                                                    !notification.read ? 'bg-blue-50' : ''
                                                }`}
                                            >
                                                <p className="text-sm text-gray-800">{notification.message}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {new Date(notification.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={signOut} className="text-sm text-red-600 hover:underline">Sign Out</button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="py-2 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700"
                    >
                        <Plus size={16} />
                        New Request
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="p-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 gap-6">
                    {/* Stats or Filters could go here */}

                    {/* Requests List */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-800">My Requests</h2>
                        </div>

                        {loading ? (
                            <div className="p-6 text-center text-gray-500">Loading...</div>
                        ) : requests.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">No requests found. Create one to get started.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Client</th>
                                            <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Consultant</th>
                                            <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                                            <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {requests.map((req) => (
                                            <tr key={req.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{req.client_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{req.consultant?.full_name || 'Unassigned'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                                    <div className="flex flex-col">
                                                        <span>{req.requested_date}</span>
                                                        <span className="text-xs text-gray-500">
                                                            {req.from_time && req.to_time 
                                                                ? `${req.from_time} - ${req.to_time}`
                                                                : req.requested_time || 'N/A'
                                                            }
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium ${
                                                        req.status === 'approved' ? 'bg-teal-100 text-teal-800' :
                                                        req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                        req.status === 'rescheduled' ? 'bg-orange-100 text-orange-800' :
                                                        'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 max-w-xs truncate">{req.notes}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6 border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Request Availability</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                                <span className="sr-only">Close</span>
                                <svg className="flex-shrink-0 w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Client Name</label>
                                <input type="text" required value={clientName} onChange={e => setClientName(e.target.value)} className="py-3 px-4 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none" placeholder="Enter client name" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Consultant</label>
                                <select required value={consultantId} onChange={e => setConsultantId(e.target.value)} className="py-3 px-4 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none">
                                    <option value="">Select a consultant</option>
                                    {consultants.map(c => (
                                        <option key={c.id} value={c.id}>{c.full_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Date</label>
                                <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="py-3 px-4 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">From Time</label>
                                    <input type="time" required value={fromTime} onChange={e => setFromTime(e.target.value)} className="py-3 px-4 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">To Time</label>
                                    <input type="time" required value={toTime} onChange={e => setToTime(e.target.value)} className="py-3 px-4 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Notes</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="py-3 px-4 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none" rows="3" placeholder="Additional details..."></textarea>
                            </div>

                            <div className="flex justify-end gap-x-2">
                                <button type="button" onClick={() => setShowModal(false)} className="py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-800 shadow-sm hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700">
                                    Submit Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
