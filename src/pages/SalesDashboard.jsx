import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Calendar, Clock, User } from 'lucide-react'

export default function SalesDashboard() {
    const { user, signOut } = useAuth()
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [consultants, setConsultants] = useState([])

    // Form State
    const [clientName, setClientName] = useState('')
    const [consultantId, setConsultantId] = useState('')
    const [date, setDate] = useState('')
    const [time, setTime] = useState('')
    const [notes, setNotes] = useState('')

    useEffect(() => {
        fetchRequests()
        fetchConsultants()

        // Realtime subscription
        const subscription = supabase
            .channel('requests_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `created_by=eq.${user.id}` }, (payload) => {
                fetchRequests() // Refresh on change
            })
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [user.id])

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

    const checkTimeSlotAvailability = async (consultantId, requestedDate, requestedTime) => {
        // Parse the requested time
        const requestedDateTime = new Date(`${requestedDate}T${requestedTime}`)
        const requestedEndTime = new Date(requestedDateTime.getTime() + 60 * 60 * 1000) // Add 1 hour for the slot
        const requestedBufferEnd = new Date(requestedEndTime.getTime() + 20 * 60 * 1000) // Add 20 minutes buffer after slot

        // Check for existing approved or pending bookings for this consultant on the same date
        const { data: existingBookings, error } = await supabase
            .from('requests')
            .select('requested_date, requested_time, status')
            .eq('consultant_id', consultantId)
            .eq('requested_date', requestedDate)
            .in('status', ['pending', 'approved'])

        if (error) {
            console.error('Error checking availability:', error)
            return { available: false, message: 'Error checking availability' }
        }

        // Check if there's any conflict
        for (const booking of existingBookings || []) {
            const bookingStart = new Date(`${booking.requested_date}T${booking.requested_time}`)
            const bookingEnd = new Date(bookingStart.getTime() + 60 * 60 * 1000) // 1 hour slot
            const bookingBufferEnd = new Date(bookingEnd.getTime() + 20 * 60 * 1000) // 20 min buffer after booking

            // Check for any overlap or conflict:
            // 1. Requested slot starts before booking but ends during booking or buffer
            // 2. Requested slot starts during booking or buffer
            // 3. Requested slot completely contains the booking
            const requestedStartsBeforeAndOverlaps = requestedDateTime < bookingStart && requestedBufferEnd > bookingStart
            const requestedStartsDuringBooking = requestedDateTime >= bookingStart && requestedDateTime < bookingBufferEnd
            const requestedContainsBooking = requestedDateTime <= bookingStart && requestedBufferEnd >= bookingBufferEnd

            if (requestedStartsBeforeAndOverlaps || requestedStartsDuringBooking || requestedContainsBooking) {
                // Calculate the next available time (booking end + 20 min buffer)
                const nextAvailable = new Date(bookingBufferEnd)
                const nextHour = String(nextAvailable.getHours()).padStart(2, '0')
                const nextMinute = String(nextAvailable.getMinutes()).padStart(2, '0')
                const nextAvailableTime = `${nextHour}:${nextMinute}`
                
                return {
                    available: false,
                    message: `This consultant is already booked at ${booking.requested_time}. Please choose a time after ${nextAvailableTime} (with 20-minute buffer).`
                }
            }
        }

        return { available: true }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!consultantId || !date || !time) {
            alert('Please fill in all required fields')
            return
        }

        // Check time slot availability
        const availability = await checkTimeSlotAvailability(consultantId, date, time)
        
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
                    requested_time: time,
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
            setTime('')
            setNotes('')
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Sales Dashboard</h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Welcome, {user.email}</span>
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
                                                        <span className="text-xs text-gray-500">{req.requested_time}</span>
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">Date</label>
                                    <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="py-3 px-4 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">Time</label>
                                    <input type="time" required value={time} onChange={e => setTime(e.target.value)} className="py-3 px-4 block w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none" />
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
