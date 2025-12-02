import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RoleGuard({ allowedRoles }) {
    const { user, profile, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full" role="status" aria-label="loading">
                    <span className="sr-only">Loading...</span>
                </div>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    if (allowedRoles && !allowedRoles.includes(profile?.role)) {
        // Redirect to their appropriate dashboard if they try to access unauthorized route
        if (profile?.role === 'admin') return <Navigate to="/admin" replace />
        if (profile?.role === 'consultant') return <Navigate to="/consultant" replace />
        if (profile?.role === 'sales') return <Navigate to="/sales" replace />
        return <Navigate to="/" replace />
    }

    return <Outlet />
}
