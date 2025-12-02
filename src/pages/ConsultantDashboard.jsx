import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { Check, X, Clock, Calendar, MessageSquare } from 'lucide-react'

export default function ConsultantDashboard() {
    const { user, signOut } = useAuth()
    const { addToast } = useNotification()
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedRequest, setSelectedRequest] = useState(null)
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rescheduleTime, setRescheduleTime] = useState('')
    const [rescheduleDate, setRescheduleDate] = useState('')
    const [rescheduleMessage, setRescheduleMessage] = useState('')

    useEffect(() => {
        fetchRequests()

        const subscription = supabase
            .channel('consultant_requests')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `consultant_id=eq.${user.id}` }, (payload) => {
                fetchRequests()
            })
            .subscribe()

        return () => {
            subscription.unsubscribe()
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
            alert('Error approving request: ' + error.message)
        } else {
            // Send notification to sales person
            const salesPersonId = request.created_by_profile?.id || request.created_by
            console.log('Sending approval notification to sales person:', salesPersonId, 'Request:', request)
            
            if (salesPersonId) {
                await sendNotificationToSales(salesPersonId, {
                    type: 'approved',
                    requestId: request.id,
                    clientName: request.client_name,
                    date: request.requested_date,
                    time: request.requested_time
                })
            } else {
                console.error('Cannot send notification: sales person ID not found', request)
            }
            addToast(`Request for ${request.client_name} has been approved`)
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
            alert('Error rejecting request: ' + error.message)
        } else {
            // Send notification to sales person
            const salesPersonId = selectedRequest.created_by_profile?.id || selectedRequest.created_by
            console.log('Sending rejection notification to sales person:', salesPersonId)
            
            if (salesPersonId) {
                await sendNotificationToSales(salesPersonId, {
                    type: 'rejected',
                    requestId: selectedRequest.id,
                    clientName: selectedRequest.client_name
                })
            } else {
                console.error('Cannot send notification: sales person ID not found', selectedRequest)
            }
            addToast(`Request for ${selectedRequest.client_name} has been rejected`)
            setShowRejectModal(false)
            setSelectedRequest(null)
            setRescheduleDate('')
            setRescheduleTime('')
            setRescheduleMessage('')
            fetchRequests()
        }
    }

    const handleReschedule = async () => {
        if (!selectedRequest || !rescheduleDate || !rescheduleTime) {
            alert('Please provide both date and time for rescheduling')
            return
        }

        const { error } = await supabase
            .from('requests')
            .update({ 
                status: 'rescheduled',
                requested_date: rescheduleDate,
                requested_time: rescheduleTime,
                notes: rescheduleMessage ? `${selectedRequest.notes || ''}\n\nReschedule message: ${rescheduleMessage}`.trim() : selectedRequest.notes,
                updated_at: new Date().toISOString()
            })
            .eq('id', selectedRequest.id)

        if (error) {
            alert('Error rescheduling request: ' + error.message)
        } else {
            // Send notification to sales person
            const salesPersonId = selectedRequest.created_by_profile?.id || selectedRequest.created_by
            console.log('Sending reschedule notification to sales person:', salesPersonId)
            
            if (salesPersonId) {
                await sendNotificationToSales(salesPersonId, {
                    type: 'rescheduled',
                    requestId: selectedRequest.id,
                    clientName: selectedRequest.client_name,
                    newDate: rescheduleDate,
                    newTime: rescheduleTime,
                    message: rescheduleMessage
                })
            } else {
                console.error('Cannot send notification: sales person ID not found', selectedRequest)
            }
            addToast(`Request for ${selectedRequest.client_name} has been rescheduled`)
            setShowRejectModal(false)
            setSelectedRequest(null)
            setRescheduleDate('')
            setRescheduleTime('')
            setRescheduleMessage('')
            fetchRequests()
        }
    }

    const sendNotificationToSales = async (salesPersonId, notificationData) => {
        try {
            let message = ''
            if (notificationData.type === 'approved') {
                message = `Request for "${notificationData.clientName}" has been approved`
            } else if (notificationData.type === 'rejected') {
                message = `Request for "${notificationData.clientName}" has been rejected`
            } else if (notificationData.type === 'rescheduled') {
                message = `Request for "${notificationData.clientName}" has been rescheduled to ${notificationData.newDate} at ${notificationData.newTime}`
            }

            if (message) {
                console.log('Inserting notification:', {
                    recipient_id: salesPersonId,
                    message: message,
                    type: notificationData.type
                })

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
                    alert('Failed to send notification: ' + error.message)
                } else {
                    console.log('Notification inserted successfully:', data)
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
        setRescheduleTime(request.requested_time)
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
            <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Consultant Dashboard</h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Welcome, {user.email}</span>
                    <button onClick={signOut} className="text-sm text-red-600 hover:underline">Sign Out</button>
                </div>
            </header>

            <main className="p-6 max-w-7xl mx-auto">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">All Requests</h2>
                    <p className="text-sm text-gray-500">Manage your availability requests here.</p>
                </div>

                {loading ? (
                    <div className="text-center py-10 text-gray-600">Loading...</div>
                ) : requests.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-10 text-center">
                        <div className="text-gray-500">No requests at the moment.</div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Pending Requests */}
                        {groupedRequests.pending.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Pending Requests ({groupedRequests.pending.length})</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {groupedRequests.pending.map(req => (
                                        <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-bold text-gray-800">{req.client_name}</h3>
                                                    <p className="text-xs text-gray-500">Requested by: {req.created_by_profile?.full_name || 'Sales Rep'}</p>
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
                                                    <span>{req.requested_time}</span>
                                                </div>
                                                {req.notes && (
                                                    <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-600 italic">
                                                        "{req.notes}"
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                                <button
                                                    onClick={() => handleApprove(req)}
                                                    className="py-2 px-3 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-teal-500 text-white hover:bg-teal-600"
                                                >
                                                    <Check size={16} />
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => openRejectModal(req)}
                                                    className="py-2 px-3 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-red-500 text-white hover:bg-red-600"
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
                                        <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-bold text-gray-800">{req.client_name}</h3>
                                                    <p className="text-xs text-gray-500">Requested by: {req.created_by_profile?.full_name || 'Sales Rep'}</p>
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
                                                    <span>{req.requested_time}</span>
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
                                        <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-bold text-gray-800">{req.client_name}</h3>
                                                    <p className="text-xs text-gray-500">Requested by: {req.created_by_profile?.full_name || 'Sales Rep'}</p>
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
                                                    <span>{req.requested_time}</span>
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
                                        <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-bold text-gray-800">{req.client_name}</h3>
                                                    <p className="text-xs text-gray-500">Requested by: {req.created_by_profile?.full_name || 'Sales Rep'}</p>
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
                                                    <span>{req.requested_time}</span>
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
                <div className="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Reject & Reschedule Request</h3>
                        <p className="text-sm text-gray-600 mb-4">You can reject this request and optionally propose a new time.</p>
                        
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
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">New Time</label>
                                <input 
                                    type="time" 
                                    value={rescheduleTime} 
                                    onChange={e => setRescheduleTime(e.target.value)} 
                                    className="py-2 px-3 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none" 
                                />
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
                                        setRescheduleTime('')
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
