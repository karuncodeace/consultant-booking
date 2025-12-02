import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { BarChart, Users, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function AdminDashboard() {
    const { user, signOut } = useAuth()
    const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, pending: 0 })
    const [allRequests, setAllRequests] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()

        const subscription = supabase
            .channel('admin_all_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, (payload) => {
                fetchData()
            })
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    const fetchData = async () => {
        const { data, error } = await supabase
            .from('requests')
            .select('*, created_by_profile:created_by(full_name), consultant:consultant_id(full_name)')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching admin data:', error)
        } else {
            setAllRequests(data)
            calculateStats(data)
        }
        setLoading(false)
    }

    const calculateStats = (data) => {
        const newStats = {
            total: data.length,
            approved: data.filter(r => r.status === 'approved').length,
            rejected: data.filter(r => r.status === 'rejected').length,
            pending: data.filter(r => r.status === 'pending').length,
            rescheduled: data.filter(r => r.status === 'rescheduled').length,
        }
        setStats(newStats)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Admin Access</span>
                    <button onClick={signOut} className="text-sm text-red-600 hover:underline">Sign Out</button>
                </div>
            </header>

            <main className="p-6 max-w-7xl mx-auto">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                            <BarChart size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Requests</p>
                            <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                        <div className="p-3 bg-teal-100 text-teal-600 rounded-lg">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Approved</p>
                            <h3 className="text-2xl font-bold text-gray-800">{stats.approved}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                        <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                            <XCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Rejected</p>
                            <h3 className="text-2xl font-bold text-gray-800">{stats.rejected}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                        <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Pending</p>
                            <h3 className="text-2xl font-bold text-gray-800">{stats.pending}</h3>
                        </div>
                    </div>
                </div>

                {/* Detailed Report */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800">Activity Report</h2>
                    </div>

                    {loading ? (
                        <div className="p-6 text-center text-gray-500">Loading data...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Client</th>
                                        <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Sales Rep</th>
                                        <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Consultant</th>
                                        <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {allRequests.map((req) => (
                                        <tr key={req.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{new Date(req.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{req.client_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{req.created_by_profile?.full_name || 'Unknown'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{req.consultant?.full_name || 'Unassigned'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium ${
                                                    req.status === 'approved' ? 'bg-teal-100 text-teal-800' :
                                                    req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    req.status === 'rescheduled' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {req.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
