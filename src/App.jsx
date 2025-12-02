import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import RoleGuard from './components/RoleGuard'
import Login from './pages/Login'

// Placeholder components for now
import SalesDashboard from './pages/SalesDashboard'
import ConsultantDashboard from './pages/ConsultantDashboard'
import AdminDashboard from './pages/AdminDashboard'

const HomeRedirect = () => {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />
  if (profile?.role === 'consultant') return <Navigate to="/consultant" replace />
  if (profile?.role === 'sales') return <Navigate to="/sales" replace />
  return <Navigate to="/login" replace />
}

import { NotificationProvider } from './contexts/NotificationContext'

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<RoleGuard allowedRoles={['sales']} />}>
              <Route path="/sales" element={<SalesDashboard />} />
            </Route>

            <Route element={<RoleGuard allowedRoles={['consultant']} />}>
              <Route path="/consultant" element={<ConsultantDashboard />} />
            </Route>

            <Route element={<RoleGuard allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            <Route path="/" element={<HomeRedirect />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
