import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Check, X, Clock, Calendar, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ConsultantDashboard() {
    const { user, profile, signOut } = useAuth()
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedRequest, setSelectedRequest] = useState(null)
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rescheduleFromTime, setRescheduleFromTime] = useState('')
    const [rescheduleToTime, setRescheduleToTime] = useState('')
    const [rescheduleDate, setRescheduleDate] = useState('')
    const [rescheduleMessage, setRescheduleMessage] = useState('')

    useEffect(() => {
        fetchRequests()

        // Realtime subscription for requests assigned to this consultant
        // Listen to ALL events (INSERT for new requests, UPDATE for status changes)
        const subscription = supabase
            .channel(`consultant_requests_${user.id}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'requests', 
                filter: `consultant_id=eq.${user.id}` 
            }, (payload) => {
                console.log('Request changed (consultant):', payload)
                fetchRequests() // Refresh on any change
            })
            .subscribe((status) => {
                console.log('Consultant requests channel subscription status:', status)
            })

        return () => {
            subscription.unsubscribe()
            supabase.removeChannel(subscription)
        }
    }, [user.id])

    const fetchRequests = async () => {
        const { data, error } = await supabase
            .from('requests')
            .select('*, created_by_profile:created_by(full_name, id)')
            .eq('consultant_id', user.id)
            .order('created_at', { ascending: false })

        if (error) console.error('Error fetching requests:', error)
        else setRequests(data)
        setLoading(false)
    }

    const handleApprove = async (request) => {
        const { error } = await supabase
            .from('requests')
            .update({ 
                status: 'approved',
                updated_at: new Date().toISOString()
            })
            .eq('id', request.id)

        if (error) {
            toast.error('Error approving request: ' + error.message)
        } else {
            toast.success(`Request for ${request.client_name} has been approved`)
            
            // Send notification to sales person (optional - won't break if it fails)
            const salesPersonId = request.created_by_profile?.id || request.created_by
            if (salesPersonId) {
                sendNotificationToSales(salesPersonId, {
                    type: 'approved',
                    requestId: request.id,
                    clientName: request.client_name,
                    date: request.requested_date,
                    time: `${request.from_time} - ${request.to_time}`
                }).catch(err => {
                    console.warn('Notification failed (optional):', err)
                })
            }
            
            // Refresh requests immediately - realtime subscription will also update
            fetchRequests()
        }
    }

    const handleReject = async () => {
        if (!selectedRequest) return

        const { error } = await supabase
            .from('requests')
            .update({ 
                status: 'rejected',
                updated_at: new Date().toISOString()
            })
            .eq('id', selectedRequest.id)

        if (error) {
            toast.error('Error rejecting request: ' + error.message)
        } else {
            toast.success(`Request for ${selectedRequest.client_name} has been rejected`)
            
            // Send notification to sales person (optional - won't break if it fails)
            const salesPersonId = selectedRequest.created_by_profile?.id || selectedRequest.created_by
            if (salesPersonId) {
                sendNotificationToSales(salesPersonId, {
                    type: 'rejected',
                    requestId: selectedRequest.id,
                    clientName: selectedRequest.client_name
                }).catch(err => {
                    console.warn('Notification failed (optional):', err)
                })
            }
            
            setShowRejectModal(false)
            setSelectedRequest(null)
            setRescheduleDate('')
            setRescheduleFromTime('')
            setRescheduleToTime('')
            setRescheduleMessage('')
            // Refresh requests immediately - realtime subscription will also update
            fetchRequests()
        }
    }

    const handleReschedule = async () => {
        if (!selectedRequest || !rescheduleDate || !rescheduleFromTime || !rescheduleToTime) {
            toast.error('Please provide date, from time, and to time for rescheduling')
            return
        }

        if (rescheduleFromTime >= rescheduleToTime) {
            toast.error('End time must be after start time')
            return
        }

        const { error } = await supabase
            .from('requests')
            .update({ 
                status: 'rescheduled',
                requested_date: rescheduleDate,
                from_time: rescheduleFromTime,
                to_time: rescheduleToTime,
                notes: rescheduleMessage ? `${selectedRequest.notes || ''}\n\nReschedule message: ${rescheduleMessage}`.trim() : selectedRequest.notes,
                updated_at: new Date().toISOString()
            })
            .eq('id', selectedRequest.id)

        if (error) {
            toast.error('Error rescheduling request: ' + error.message)
        } else {
            toast.success(`Request for ${selectedRequest.client_name} has been rescheduled`)
            
            // Send notification to sales person (optional - won't break if it fails)
            const salesPersonId = selectedRequest.created_by_profile?.id || selectedRequest.created_by
            if (salesPersonId) {
                sendNotificationToSales(salesPersonId, {
                    type: 'rescheduled',
                    requestId: selectedRequest.id,
                    clientName: selectedRequest.client_name,
                    newDate: rescheduleDate,
                    newTime: `${rescheduleFromTime} - ${rescheduleToTime}`,
                    message: rescheduleMessage
                }).catch(err => {
                    console.warn('Notification failed (optional):', err)
                })
            }
            
            setShowRejectModal(false)
            setSelectedRequest(null)
            setRescheduleDate('')
            setRescheduleFromTime('')
            setRescheduleToTime('')
            setRescheduleMessage('')
            // Refresh requests immediately - realtime subscription will also update
            fetchRequests()
        }
    }

    const sendNotificationToSales = async (salesPersonId, notificationData) => {
        try {
            // Get consultant name from profile
            const consultantName = profile?.full_name || user?.email || 'Consultant'
            
            // Helper function to format date
            const formatDate = (dateString) => {
                if (!dateString) return ''
                try {
                    const date = new Date(dateString)
                    return date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })
                } catch {
                    return dateString
                }
            }
            
            let message = ''
            if (notificationData.type === 'approved') {
                // Format: "Your request for {client name} on {date}, {time} has been approved by {consultant name}"
                const formattedDate = formatDate(notificationData.date)
                message = `Your request for ${notificationData.clientName} on ${formattedDate}, ${notificationData.time} has been approved by ${consultantName}`
            } else if (notificationData.type === 'rejected') {
                message = `Your request for ${notificationData.clientName} has been rejected by ${consultantName}`
            } else if (notificationData.type === 'rescheduled') {
                // Format: "Your request for {client name} on {date}, {time} has been rescheduled by {consultant name}"
                const formattedDate = formatDate(notificationData.newDate)
                message = `Your request for ${notificationData.clientName} on ${formattedDate}, ${notificationData.newTime} has been rescheduled by ${consultantName}`
            }

            if (message) {
                console.log('Inserting notification:', {
                    recipient_id: salesPersonId,
                    message: message,
                    type: notificationData.type
                })

                // Get current user to verify authentication
                const { data: { user: currentUser } } = await supabase.auth.getUser()
                console.log('Current user inserting notification:', currentUser?.id)
                console.log('Recipient ID (sales person):', salesPersonId)

                const { data, error } = await supabase
                    .from('notifications')
                    .insert({
                        recipient_id: salesPersonId,
                        message: message,
                        type: notificationData.type
                    })
                    .select()

                if (error) {
                    console.error('Error inserting notification:', error)
                    console.error('Error details:', {
                        message: error.message,
                        details: error.details,
                        hint: error.hint,
                        code: error.code
                    })
                    toast.error('Failed to send notification: ' + error.message)
                } else {
                    console.log('Notification inserted successfully:', data)
                    
                    // Send push notification via Edge Function
                    try {
                        const { error: pushError } = await supabase.functions.invoke('send-notification', {
                            body: {
                                recipient_id: salesPersonId,
                                title: notificationData.type === 'approved' ? 'Request Approved' : 
                                       notificationData.type === 'rejected' ? 'Request Rejected' : 
                                       'Request Rescheduled',
                                body: message,
                                data: {
                                    type: notificationData.type,
                                    requestId: notificationData.requestId,
                                    clientName: notificationData.clientName
                                }
                            }
                        })
                        
                        if (pushError) {
                            console.error('Error sending push notification:', pushError)
                            // Don't show error to user - push notification is optional
                        } else {
                            console.log('Push notification sent successfully')
                        }
                    } catch (pushErr) {
                        console.error('Error calling push notification function:', pushErr)
                        // Push notifications are optional, so we don't block the flow
                    }
                }
            }
        } catch (error) {
            console.error('Error sending notification:', error)
            alert('Error sending notification: ' + error.message)
        }
    }

    const openRejectModal = (request) => {
        setSelectedRequest(request)
        setRescheduleDate(request.requested_date)
        setRescheduleFromTime(request.from_time || '')
        setRescheduleToTime(request.to_time || '')
        setRescheduleMessage('')
        setShowRejectModal(true)
    }

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pending' },
            approved: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Approved' },
            rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
            rescheduled: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Rescheduled' }
        }
        const config = statusConfig[status] || statusConfig.pending
        return (
            <span className={`inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        )
    }

    const groupedRequests = {
        pending: requests.filter(r => r.status === 'pending'),
        approved: requests.filter(r => r.status === 'approved'),
        rejected: requests.filter(r => r.status === 'rejected'),
        rescheduled: requests.filter(r => r.status === 'rescheduled')
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b border-gray-200 py-4 px-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Consultant Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Review and manage availability requests</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Welcome, {user.email}</span>
                    <button onClick={signOut} className="text-sm text-red-600 hover:text-red-700 hover:underline font-medium">Sign Out</button>
                </div>
            </header>

            <main className="p-6 max-w-7xl mx-auto">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">All Requests</h2>
                    <p className="text-sm text-gray-500 mt-1">Review and respond to availability requests from sales team.</p>
                </div>

                {loading ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-gray-600">Loading requests...</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">No requests at the moment</p>
                        <p className="text-sm text-gray-500 mt-1">Requests from sales team will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Pending Requests */}
                        {groupedRequests.pending.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Pending Requests ({groupedRequests.pending.length})</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {groupedRequests.pending.map(req => (
                                        <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6 flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg">{req.client_name}</h3>
                                                    <p className="text-xs text-gray-500 mt-1">Requested by: {req.created_by_profile?.full_name || 'Sales Rep'}</p>
                                                </div>
                                                {getStatusBadge(req.status)}
                                            </div>

                                            <div className="space-y-2 mb-6 flex-1">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Calendar size={16} />
                                                    <span>{req.requested_date}</span>
                                                </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Clock size={16} />
                                        <span>
                                            {req.from_time && req.to_time 
                                                ? `${req.from_time} - ${req.to_time}`
                                                : 'N/A'
                                            }
                                        </span>
                                    </div>
                                                {req.notes && (
                                                    <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-600 italic">
                                                        "{req.notes}"
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-gray-100">
                                                <button
                                                    onClick={() => handleApprove(req)}
                                                    className="py-2.5 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-teal-500 text-white hover:bg-teal-600 transition-colors shadow-sm"
                                                >
                                                    <Check size={16} />
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => openRejectModal(req)}
                                                    className="py-2.5 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
                                                >
                                                    <X size={16} />
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Approved Requests */}
                        {groupedRequests.approved.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Approved Requests ({groupedRequests.approved.length})</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {groupedRequests.approved.map(req => (
                                        <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6 flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg">{req.client_name}</h3>
                                                    <p className="text-xs text-gray-500 mt-1">Requested by: {req.created_by_profile?.full_name || 'Sales Rep'}</p>
                                                </div>
                                                {getStatusBadge(req.status)}
                                            </div>

                                            <div className="space-y-2 mb-6 flex-1">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Calendar size={16} />
                                                    <span>{req.requested_date}</span>
                                                </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Clock size={16} />
                                        <span>
                                            {req.from_time && req.to_time 
                                                ? `${req.from_time} - ${req.to_time}`
                                                : 'N/A'
                                            }
                                        </span>
                                    </div>
                                                {req.notes && (
                                                    <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-600 italic">
                                                        "{req.notes}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Rejected Requests */}
                        {groupedRequests.rejected.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Rejected Requests ({groupedRequests.rejected.length})</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {groupedRequests.rejected.map(req => (
                                        <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6 flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg">{req.client_name}</h3>
                                                    <p className="text-xs text-gray-500 mt-1">Requested by: {req.created_by_profile?.full_name || 'Sales Rep'}</p>
                                                </div>
                                                {getStatusBadge(req.status)}
                                            </div>

                                            <div className="space-y-2 mb-6 flex-1">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Calendar size={16} />
                                                    <span>{req.requested_date}</span>
                                                </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Clock size={16} />
                                        <span>
                                            {req.from_time && req.to_time 
                                                ? `${req.from_time} - ${req.to_time}`
                                                : 'N/A'
                                            }
                                        </span>
                                    </div>
                                                {req.notes && (
                                                    <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-600 italic">
                                                        "{req.notes}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Rescheduled Requests */}
                        {groupedRequests.rescheduled.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Rescheduled Requests ({groupedRequests.rescheduled.length})</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {groupedRequests.rescheduled.map(req => (
                                        <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6 flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg">{req.client_name}</h3>
                                                    <p className="text-xs text-gray-500 mt-1">Requested by: {req.created_by_profile?.full_name || 'Sales Rep'}</p>
                                                </div>
                                                {getStatusBadge(req.status)}
                                            </div>

                                            <div className="space-y-2 mb-6 flex-1">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Calendar size={16} />
                                                    <span>{req.requested_date}</span>
                                                </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Clock size={16} />
                                        <span>
                                            {req.from_time && req.to_time 
                                                ? `${req.from_time} - ${req.to_time}`
                                                : 'N/A'
                                            }
                                        </span>
                                    </div>
                                                {req.notes && (
                                                    <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-600 italic">
                                                        "{req.notes}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Reject/Reschedule Modal */}
            {showRejectModal && selectedRequest && (
                <div className="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Reject & Reschedule Request</h3>
                        <p className="text-sm text-gray-600 mb-6">You can reject this request and optionally propose a new time.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">New Date</label>
                                <input 
                                    type="date" 
                                    value={rescheduleDate} 
                                    onChange={e => setRescheduleDate(e.target.value)} 
                                    className="py-2 px-3 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none" 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">From Time</label>
                                    <input 
                                        type="time" 
                                        value={rescheduleFromTime} 
                                        onChange={e => setRescheduleFromTime(e.target.value)} 
                                        className="py-2 px-3 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">To Time</label>
                                    <input 
                                        type="time" 
                                        value={rescheduleToTime} 
                                        onChange={e => setRescheduleToTime(e.target.value)} 
                                        className="py-2 px-3 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Message (Optional)</label>
                                <textarea 
                                    value={rescheduleMessage} 
                                    onChange={e => setRescheduleMessage(e.target.value)} 
                                    className="py-2 px-3 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none" 
                                    rows="3"
                                    placeholder="Add a message for the sales person..."
                                />
                            </div>
                            <div className="flex justify-end gap-x-2 mt-6">
                                <button 
                                    onClick={() => {
                                        setShowRejectModal(false)
                                        setSelectedRequest(null)
                                        setRescheduleDate('')
                                        setRescheduleFromTime('')
                                        setRescheduleToTime('')
                                        setRescheduleMessage('')
                                    }} 
                                    className="py-2 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-800 shadow-sm hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    className="py-2 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-red-500 text-white hover:bg-red-600"
                                >
                                    Reject Only
                                </button>
                                <button
                                    onClick={handleReschedule}
                                    className="py-2 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    <MessageSquare size={16} />
                                    Reject & Reschedule
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
